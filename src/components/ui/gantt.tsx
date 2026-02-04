'use client';

import type { FC, HTMLAttributes, ReactNode } from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  addDays,
  addMonths,
  differenceInDays,
  endOfDay,
  endOfMonth,
  format,
  isSameDay,
  max,
  min,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import throttle from 'lodash.throttle';
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

export type Range = {
  from: Date;
  to: Date;
};

export type Groupable = {
  id: string;
  name: string;
};

export type TimelineData = Groupable & {
  startAt: Date;
  endAt: Date;
};

export type GanttFeature = TimelineData & {
  status?: {
    color: string;
    name: string;
  };
  owner?: {
    id: string;
    name?: string;
    image?: string;
  };
  product?: Groupable;
};

export type GanttMarker = {
  id: string;
  date: Date;
  label: string;
  className?: string;
};

type Dragging = {
  feature: GanttFeature;
  direction: 'left' | 'right' | 'body';
};

const ganttRange = atom<Range | null>(null);
const ganttDragging = atom<Dragging | null>(null);
const ganttGroupBy = atom<'owner' | 'product' | 'none'>('none');
const ganttZoom = atom<number>(100);

const featureAtomFamily = atomFamily(
  (props: GanttFeature) => atom(props),
  (a, b) => a.id === b.id
);

export type GanttContentHeaderProps = HTMLAttributes<HTMLDivElement>;

export const GanttContentHeader: FC<GanttContentHeaderProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn('bg-muted', className)} {...props}>
      {children}
    </div>
  );
};

export type GanttSidebarProps = HTMLAttributes<HTMLDivElement>;

export const GanttSidebar: FC<GanttSidebarProps> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('space-y-2', className)} {...props}>
    {children}
  </div>
);

export type GanttSidebarGroupProps = HTMLAttributes<HTMLDivElement>;

export const GanttSidebarGroup: FC<GanttSidebarGroupProps> = ({
  className,
  children,
  ...props
}) => (
  <Card className={cn('shadow-none', className)} {...props}>
    {children}
  </Card>
);

type GanttSidebarGroupHeaderProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
};

export const GanttSidebarGroupHeader: FC<GanttSidebarGroupHeaderProps> = ({
  className,
  name,
  collapsed,
  setCollapsed,
  ...props
}) => (
  <CardHeader
    className={cn('cursor-pointer p-3', className)}
    onClick={() => setCollapsed?.(!collapsed)}
    {...props}
  >
    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
      {collapsed ? (
        <ChevronRight className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )}
      {name}
    </CardTitle>
  </CardHeader>
);

export type GanttSidebarGroupContentProps = HTMLAttributes<HTMLDivElement> & {
  collapsed?: boolean;
};

export const GanttSidebarGroupContent: FC<GanttSidebarGroupContentProps> = ({
  className,
  children,
  collapsed,
  ...props
}) => (
  <CardContent
    className={cn('space-y-1 p-1', collapsed && 'hidden', className)}
    {...props}
  >
    {children}
  </CardContent>
);

type GanttSidebarItemProps = HTMLAttributes<HTMLDivElement> & {
  feature: GanttFeature;
  onSelectItem?: ((id: string) => void) | undefined;
};

export const GanttSidebarItem: FC<GanttSidebarItemProps> = ({
  className,
  feature,
  onSelectItem,
  ...props
}) => (
  <div
    className={cn(
      'flex items-center gap-2 rounded-md p-2 hover:bg-muted cursor-pointer',
      className
    )}
    onClick={() => onSelectItem?.(feature.id)}
    {...props}
  >
    <GripVertical className="h-4 w-4 text-muted-foreground" />
    <span className="flex-1 text-sm truncate">{feature.name}</span>
    {feature.status && (
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: feature.status.color }}
      />
    )}
  </div>
);

type GanttProviderProps = {
  children: ReactNode;
  range?: Range | undefined;
  zoom?: number;
};

export const GanttProvider: FC<GanttProviderProps> = ({
  children,
  range,
  zoom: initialZoom = 100,
}) => {
  const setRange = useSetAtom(ganttRange);
  const setZoom = useSetAtom(ganttZoom);

  useEffect(() => {
    if (range) {
      setRange(range);
    }
  }, [range, setRange]);

  useEffect(() => {
    setZoom(initialZoom);
  }, [initialZoom, setZoom]);

  return <>{children}</>;
};

type GanttTimelineProps = HTMLAttributes<HTMLDivElement> & {
  features?: GanttFeature[];
  markers?: GanttMarker[];
  range?: Range | undefined;
  onSelectFeature?: ((id: string) => void) | undefined;
  onUpdateFeature?: ((feature: GanttFeature) => void) | undefined;
};

export const GanttTimeline: FC<GanttTimelineProps> = ({
  className,
  features = [],
  markers = [],
  range,
  onSelectFeature,
  onUpdateFeature,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const zoom = useAtomValue(ganttZoom);

  const computedRange = useMemo(() => {
    if (range) return range;
    if (features.length === 0) {
      const today = new Date();
      return {
        from: startOfMonth(today),
        to: endOfMonth(addMonths(today, 2)),
      };
    }
    const dates = features.flatMap((f) => [f.startAt, f.endAt]);
    return {
      from: startOfMonth(min(dates)),
      to: endOfMonth(max(dates)),
    };
  }, [features, range]);

  const days = useMemo(() => {
    const result: Date[] = [];
    let current = startOfDay(computedRange.from);
    const end = endOfDay(computedRange.to);
    while (current <= end) {
      result.push(current);
      current = addDays(current, 1);
    }
    return result;
  }, [computedRange]);

  const months = useMemo(() => {
    const result: { date: Date; days: number }[] = [];
    let current = startOfMonth(computedRange.from);
    const end = endOfMonth(computedRange.to);

    while (current <= end) {
      const monthEnd = min([endOfMonth(current), end]);
      const monthStart = max([startOfMonth(current), computedRange.from]);
      const daysInRange = differenceInDays(monthEnd, monthStart) + 1;
      result.push({ date: current, days: daysInRange });
      current = addMonths(current, 1);
    }
    return result;
  }, [computedRange]);

  const dayWidth = useMemo(() => {
    return Math.max(20, 40 * (zoom / 100));
  }, [zoom]);

  const totalWidth = useMemo(() => days.length * dayWidth, [days, dayWidth]);

  const getPositionForDate = useCallback(
    (date: Date) => {
      const dayIndex = differenceInDays(startOfDay(date), startOfDay(computedRange.from));
      return dayIndex * dayWidth;
    },
    [computedRange, dayWidth]
  );

  const getDateForPosition = useCallback(
    (x: number) => {
      const dayIndex = Math.floor(x / dayWidth);
      return addDays(computedRange.from, dayIndex);
    },
    [computedRange, dayWidth]
  );

  const handleMouseMove = useMemo(
    () => throttle((e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + containerRef.current.scrollLeft;
      setHoveredDate(getDateForPosition(x));
    }, 50),
    [getDateForPosition]
  );

  // Cleanup throttle on unmount
  useEffect(() => {
    return () => {
      handleMouseMove.cancel();
    };
  }, [handleMouseMove]);

  return (
    <div
      ref={containerRef}
      className={cn('overflow-x-auto', className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredDate(null)}
      {...props}
    >
      <div style={{ width: totalWidth, minWidth: '100%' }}>
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="flex">
            {months.map(({ date, days: daysCount }) => (
              <div
                key={date.toISOString()}
                style={{ width: daysCount * dayWidth }}
                className="border-r px-2 py-1 text-sm font-medium"
              >
                {format(date, 'MMMM yyyy')}
              </div>
            ))}
          </div>
          <div className="flex">
            {days.map((day) => (
              <div
                key={day.toISOString()}
                style={{ width: dayWidth }}
                className={cn(
                  'border-r px-1 py-1 text-center text-xs',
                  isSameDay(day, new Date()) && 'bg-primary/10',
                  hoveredDate && isSameDay(day, hoveredDate) && 'bg-muted'
                )}
              >
                {format(day, 'd')}
              </div>
            ))}
          </div>
        </div>

        <div className="relative" style={{ minHeight: features.length > 0 ? features.length * 40 + 16 : 128 }}>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                'absolute top-0 bottom-0 border-r border-muted/50',
                isSameDay(day, new Date()) && 'border-primary/30 bg-primary/5'
              )}
              style={{
                left: getPositionForDate(day),
                width: dayWidth,
              }}
            />
          ))}

          {markers.map((marker) => (
            <div
              key={marker.id}
              className={cn(
                'absolute top-0 bottom-0 w-0.5 bg-destructive z-20',
                marker.className
              )}
              style={{
                left: getPositionForDate(marker.date),
              }}
              title={marker.label}
            />
          ))}

          {features.map((feature, index) => (
            <GanttFeatureItem
              key={feature.id}
              feature={feature}
              index={index}
              getPositionForDate={getPositionForDate}
              dayWidth={dayWidth}
              onSelect={onSelectFeature ? () => onSelectFeature(feature.id) : undefined}
              onUpdate={onUpdateFeature}
              getDateForPosition={getDateForPosition}
            />
          ))}

          {features.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              No features to display
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

type GanttFeatureItemProps = {
  feature: GanttFeature;
  index: number;
  getPositionForDate: (date: Date) => number;
  getDateForPosition: (x: number) => Date;
  dayWidth: number;
  onSelect?: (() => void) | undefined;
  onUpdate?: ((feature: GanttFeature) => void) | undefined;
};

const GanttFeatureItem: FC<GanttFeatureItemProps> = ({
  feature,
  index,
  getPositionForDate,
  dayWidth,
  onSelect,
  onUpdate,
}) => {
  const [localFeature, setLocalFeature] = useState(feature);
  const [isDragging, setIsDragging] = useState<'left' | 'right' | 'body' | null>(null);
  const dragStartRef = useRef<{ x: number; startAt: Date; endAt: Date } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setLocalFeature(feature);
  }, [feature]);

  const left = getPositionForDate(localFeature.startAt);
  const width = Math.max(
    dayWidth,
    getPositionForDate(localFeature.endAt) - left + dayWidth
  );
  const top = index * 40 + 8;

  const handleDragStart = useCallback(
    (e: React.MouseEvent, direction: 'left' | 'right' | 'body') => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(direction);
      dragStartRef.current = {
        x: e.clientX,
        startAt: localFeature.startAt,
        endAt: localFeature.endAt,
      };
    },
    [localFeature]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, direction: 'left' | 'right' | 'body') => {
      const touch = e.touches[0];
      if (!touch) return;

      // Store touch start position for long-press detection
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

      // Start long-press timer for context menu (500ms)
      if (direction === 'body') {
        longPressTimerRef.current = setTimeout(() => {
          // Long press detected - show context menu
          setContextMenuPos({ x: touch.clientX, y: touch.clientY });
          setShowContextMenu(true);
          // Prevent drag from starting
          touchStartPosRef.current = null;
        }, 500);
      }

      e.stopPropagation();
      setIsDragging(direction);
      dragStartRef.current = {
        x: touch.clientX,
        startAt: localFeature.startAt,
        endAt: localFeature.endAt,
      };
    },
    [localFeature]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch || !touchStartPosRef.current) return;

      // Check if touch moved beyond tolerance (10px) - cancel long-press
      const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);
      if (deltaX > 10 || deltaY > 10) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    },
    []
  );

  const handleTouchEnd = useCallback(() => {
    // Clear long-press timer if touch ends before timer fires
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  }, []);

  // Cleanup long-press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = throttle((clientX: number) => {
      if (!dragStartRef.current) return;

      const deltaX = clientX - dragStartRef.current.x;
      const daysDelta = Math.round(deltaX / dayWidth);

      let newStartAt = dragStartRef.current.startAt;
      let newEndAt = dragStartRef.current.endAt;

      if (isDragging === 'left') {
        newStartAt = addDays(dragStartRef.current.startAt, daysDelta);
        if (newStartAt >= newEndAt) {
          newStartAt = addDays(newEndAt, -1);
        }
      } else if (isDragging === 'right') {
        newEndAt = addDays(dragStartRef.current.endAt, daysDelta);
        if (newEndAt <= newStartAt) {
          newEndAt = addDays(newStartAt, 1);
        }
      } else if (isDragging === 'body') {
        newStartAt = addDays(dragStartRef.current.startAt, daysDelta);
        newEndAt = addDays(dragStartRef.current.endAt, daysDelta);
      }

      setLocalFeature((prev) => ({
        ...prev,
        startAt: newStartAt,
        endAt: newEndAt,
      }));
    }, 16);

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX);
    };

    const handleTouchMoveGlobal = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        handleMove(touch.clientX);
      }
    };

    const handleEnd = () => {
      setIsDragging(null);
      dragStartRef.current = null;
      if (onUpdate) {
        onUpdate(localFeature);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMoveGlobal);
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMoveGlobal);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
      handleMove.cancel();
    };
  }, [isDragging, dayWidth, onUpdate, localFeature]);

  return (
    <>
      {showContextMenu && contextMenuPos && (
        <div
          className="fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          style={{
            left: contextMenuPos.x,
            top: contextMenuPos.y,
          }}
          onClick={() => setShowContextMenu(false)}
        >
          <div
            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              setShowContextMenu(false);
              onSelect?.();
            }}
          >
            View Details
          </div>
        </div>
      )}
      {showContextMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowContextMenu(false)}
        />
      )}
      <ContextMenu>
        <ContextMenuTrigger asChild>
        <div
          className={cn(
            'absolute h-8 rounded-md flex items-center px-2 cursor-pointer transition-shadow',
            'hover:shadow-md',
            isDragging && 'shadow-lg ring-2 ring-primary/50',
            feature.status?.color ? '' : 'bg-primary'
          )}
          style={{
            left,
            width,
            top,
            backgroundColor: feature.status?.color || undefined,
          }}
          onClick={onSelect}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-black/10 hover:bg-black/20 active:bg-black/30 rounded-l-md"
            onMouseDown={(e) => handleDragStart(e, 'left')}
            onTouchStart={(e) => handleTouchStart(e, 'left')}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          <span
            className="flex-1 text-xs text-white font-medium truncate cursor-move"
            onMouseDown={(e) => handleDragStart(e, 'body')}
            onTouchStart={(e) => handleTouchStart(e, 'body')}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {localFeature.name}
          </span>
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-black/10 hover:bg-black/20 active:bg-black/30 rounded-r-md"
            onMouseDown={(e) => handleDragStart(e, 'right')}
            onTouchStart={(e) => handleTouchStart(e, 'right')}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onSelect}>
          View Details
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
    </>
  );
};

type GanttProps = HTMLAttributes<HTMLDivElement> & {
  features?: GanttFeature[];
  markers?: GanttMarker[];
  range?: Range;
  zoom?: number;
  onSelectFeature?: (id: string) => void;
  onUpdateFeature?: (feature: GanttFeature) => void;
  showSidebar?: boolean;
};

export const Gantt: FC<GanttProps> = ({
  className,
  features = [],
  markers = [],
  range,
  zoom = 100,
  onSelectFeature,
  onUpdateFeature,
  showSidebar = true,
  ...props
}) => {
  return (
    <GanttProvider range={range} zoom={zoom}>
      <div className={cn('flex flex-col md:flex-row gap-2 md:gap-4', className)} {...props}>
        {showSidebar && (
          <div className="hidden md:block w-48 lg:w-64 flex-shrink-0">
            <GanttSidebar>
              <GanttSidebarGroup>
                <GanttSidebarGroupHeader name="Features" />
                <GanttSidebarGroupContent>
                  {features.map((feature) => (
                    <GanttSidebarItem
                      key={feature.id}
                      feature={feature}
                      onSelectItem={onSelectFeature}
                    />
                  ))}
                </GanttSidebarGroupContent>
              </GanttSidebarGroup>
            </GanttSidebar>
          </div>
        )}
        <div className="flex-1 overflow-hidden border rounded-lg min-w-0">
          <GanttTimeline
            features={features}
            markers={markers}
            range={range}
            onSelectFeature={onSelectFeature}
            onUpdateFeature={onUpdateFeature}
          />
        </div>
      </div>
    </GanttProvider>
  );
};

export const GanttHeader: FC<HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('flex items-center justify-between mb-4', className)} {...props}>
    {children}
  </div>
);

export const GanttTitle: FC<HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h2 className={cn('text-lg font-semibold', className)} {...props}>
    {children}
  </h2>
);

export {
  ganttRange,
  ganttZoom,
  ganttDragging,
  ganttGroupBy,
  featureAtomFamily,
};
