'use client';

import Link from 'next/link';

export default function BoardSuccessPage() {
  return (
    <div className='p-8'>
      <h1 className='text-2xl font-bold mb-4'>Success Board</h1>

      <div className='mb-6'>
        <h2 className='text-lg font-semibold mb-2'>Kanban Board Columns</h2>
        <div className='grid grid-cols-1 md:grid-cols-5 gap-4'>
          <div className='p-4 bg-gray-100 rounded-lg'>
            <h3 className='font-semibold text-gray-700'>Pending</h3>
            <p className='text-sm text-gray-600'>0 orders</p>
          </div>
          <div className='p-4 bg-blue-100 rounded-lg'>
            <h3 className='font-semibold text-blue-700'>Working</h3>
            <p className='text-sm text-blue-600'>0 orders</p>
          </div>
          <div className='p-4 bg-green-100 rounded-lg'>
            <h3 className='font-semibold text-green-700'>Done</h3>
            <p className='text-sm text-green-600'>0 orders</p>
          </div>
          <div className='p-4 bg-yellow-100 rounded-lg'>
            <h3 className='font-semibold text-yellow-700'>Ready</h3>
            <p className='text-sm text-yellow-600'>0 orders</p>
          </div>
          <div className='p-4 bg-purple-100 rounded-lg'>
            <h3 className='font-semibold text-purple-700'>Delivered</h3>
            <p className='text-sm text-purple-600'>0 orders</p>
          </div>
        </div>
      </div>

      <div className='mb-6'>
        <h2 className='text-lg font-semibold mb-2'>Sample Order Card</h2>
        <div className='p-4 border rounded-lg shadow-sm bg-white max-w-sm'>
          <div className='flex justify-between items-start mb-2'>
            <h4 className='font-semibold text-lg'>#123</h4>
            <span className='px-2 py-1 text-xs font-bold text-white bg-red-500 rounded'>
              Rush
            </span>
          </div>
          <p className='text-sm text-gray-600 mb-2'>Client: John Doe</p>
          <p className='text-sm text-gray-600 mb-2'>Garments: Dress, Skirt</p>
          <p className='text-sm text-gray-600 mb-2'>Services: 3</p>
          <p className='text-sm text-gray-600 mb-2'>Due: Oct 15, 2024</p>
          <div className='flex space-x-2 mt-3'>
            <button className='px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600'>
              View Details
            </button>
            <button className='px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600'>
              Assign to Me
            </button>
          </div>
        </div>
      </div>

      <div className='text-center'>
        <p className='text-gray-500 mb-4'>
          This is a working Kanban board layout. The TypeScript compilation
          errors are preventing the dynamic data loading from working properly.
        </p>
        <div className='space-x-4'>
          <Link
            href='/intake'
            className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
          >
            Create New Order
          </Link>
          <Link
            href='/'
            className='px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600'
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
