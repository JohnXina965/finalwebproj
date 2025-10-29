// Direct configuration - no process.env for now
export const paypalConfig = {
  clientId: 'AYvLxVjvHlfg5pL7HrRS2QJqTbJQ4Q9q4Z8Q5q2XqZq4Qq0Qq0Qq0Qq0Qq0', // Use this working sandbox ID
  environment: 'sandbox',
  currency: 'PHP',
  intent: 'subscription'
};

// Sandbox test accounts
export const sandboxTestAccounts = {
  buyer: {
    email: 'sb-43f7j29374685@personal.example.com',
    password: 'X>r8W4#&'
  }
};