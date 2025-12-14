import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export function useRealtimeOrders() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const supabase = createClient()
  const channelsRef = useRef<RealtimeChannel[]>([])

  useEffect(() => {
    let mounted = true

    const setupChannels = async () => {
      try {
        await supabase.realtime.setAuth()

        const orderChannel = supabase
          .channel('order', { config: { private: true } })
          .on('broadcast', { event: '*' }, (payload: { type: string; event: string; payload?: unknown }) => {
            console.log('🔄 Order broadcast received:', payload)
            if (mounted) setRefreshTrigger(prev => prev + 1)
          })

        const taskChannel = supabase
          .channel('task', { config: { private: true } })
          .on('broadcast', { event: '*' }, (payload: { type: string; event: string; payload?: unknown }) => {
            console.log('🔄 Task broadcast received:', payload)
            if (mounted) setRefreshTrigger(prev => prev + 1)
          })

        orderChannel.subscribe((status: string) => {
          console.log('📡 Order channel status:', status)
        })

        taskChannel.subscribe((status: string) => {
          console.log('📡 Task channel status:', status)
        })

        channelsRef.current = [orderChannel, taskChannel]
      } catch (err) {
        console.error('❌ Realtime setup error:', err)
      }
    }

    setupChannels()

    return () => {
      mounted = false
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel)
      })
      channelsRef.current = []
    }
  }, [supabase])

  return refreshTrigger
}
