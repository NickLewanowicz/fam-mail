import { useState } from 'react'
import { InteractivePostcard } from './components/postcard-editor/InteractivePostcard'
import type { Address } from './types/address'

export function ModalTestPage() {
  const [message, setMessage] = useState("Hello **world**! This is *italic* text.")
  const [address, setAddress] = useState<Address | null>({
    firstName: 'John',
    lastName: 'Doe',
    addressLine1: '123 Main St',
    city: 'Anytown',
    provinceOrState: 'CA',
    postalOrZip: '12345',
    countryCode: 'US'
  })
  const [imageData, setImageData] = useState<string>('')

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Modal Workflow Test</h1>

        <div className="bg-base-100 rounded-lg shadow-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Instructions:</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Click on the message area (left side of postcard back) to open the message modal</li>
            <li>Click on the address area (right side of postcard back) to open the address modal</li>
            <li>Make changes and click Save to see the postcard preview update</li>
          </ol>
        </div>

        <InteractivePostcard
          imageData={imageData}
          message={message}
          address={address}
          onImageUpload={setImageData}
          onMessageChange={setMessage}
          onAddressChange={setAddress}
        />

        <div className="mt-8 bg-base-100 rounded-lg shadow-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Current State:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Message:</h3>
              <pre className="bg-base-200 p-3 rounded text-sm overflow-auto">{message}</pre>
            </div>
            <div>
              <h3 className="font-medium mb-2">Address:</h3>
              <pre className="bg-base-200 p-3 rounded text-sm overflow-auto">
                {address ? JSON.stringify(address, null, 2) : 'No address set'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}