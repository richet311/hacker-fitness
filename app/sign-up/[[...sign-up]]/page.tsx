import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="mt-2 text-gray-600">Sign up to get started</p>
        </div>
        <SignUp 
          appearance={{
            variables: {
              colorPrimary: "#8B5CF6",
            },
          }}
          redirectUrl="/metrics"
        />
      </div>
    </div>
  )
}
