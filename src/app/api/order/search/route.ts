import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    const lastName = searchParams.get('lastName')

    console.log('Order search API called with:', { phone, lastName })

    if (!phone || !lastName) {
      return NextResponse.json(
        { error: 'Phone and last name are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // First, find the client by phone OR last name
    const { data: clients, error: clientError } = await supabase
      .from('client')
      .select('id, first_name, last_name, phone')
      .or(`phone.eq.${phone},last_name.ilike.%${lastName}%`)
      .limit(1)

    console.log('Client search result:', { clients, clientError })

    if (clientError) {
      throw new Error(`Client search error: ${clientError.message}`)
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json(
        { error: 'No orders found for this phone number and last name' },
        { status: 404 }
      )
    }

    const client = clients[0]
    console.log('Found client:', client)

    // Now search for orders by client_id
    const { data: orders, error } = await supabase
      .from('order')
      .select(`
        id,
        order_number,
        status,
        due_date,
        rush,
        created_at
      `)
      .eq('client_id', (client as any).id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { error: 'No orders found for this phone number and last name' },
        { status: 404 }
      )
    }

    // Return the most recent order
    const order = (orders as any[])[0]

    // Fetch garments for this order
    const { data: garments, error: garmentsError } = await supabase
      .from('garment')
      .select('id, type, label_code')
      .eq('order_id', (order as any).id)

    if (garmentsError) {
      console.error('Error fetching garments:', garmentsError)
    }

    // Fetch tasks for this order
    const { data: tasks, error: tasksError } = await supabase
      .from('task')
      .select('id, stage, assignee')
      .eq('garment_id', (garments as any[])?.[0]?.id || '')

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
    }

    // Determine the current stage based on tasks
    let currentStage = 'pending'
    if (tasks && tasks.length > 0) {
      // Get the most advanced stage
      const stageOrder = ['pending', 'working', 'done', 'ready', 'delivered']
      const maxStageIndex = Math.max(
        ...tasks.map((task: any) => stageOrder.indexOf(task.stage))
      )
      currentStage = stageOrder[maxStageIndex] || 'pending'
    }

    const response = {
      order: {
        id: (order as any).id,
        orderNumber: (order as any).order_number,
        status: (order as any).status,
        stage: currentStage,
        dueDate: (order as any).due_date,
        rush: (order as any).rush,
        client: {
          firstName: (client as any).first_name,
          lastName: (client as any).last_name,
          phone: (client as any).phone,
        },
        garments: garments || [],
        tasks: tasks || [],
      },
      // Include additional orders if multiple found
      additionalOrders: (orders as any[]).slice(1).map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number,
        status: o.status,
        dueDate: o.due_date,
        rush: o.rush,
        createdAt: o.created_at,
      })),
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
