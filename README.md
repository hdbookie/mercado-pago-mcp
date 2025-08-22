# Mercado Pago MCP Server

A comprehensive Model Context Protocol (MCP) server for Mercado Pago API integration. This server provides 27+ tools for payment processing, PIX payments with QR codes, fraud detection, analytics, accounting exports, and much more - making any AI capable of handling complete payment operations.

## 🚀 Quick Install

### Option 1: NPX (Easiest - Recommended)

Simply use `npx` to run the server directly in your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "mercado-pago": {
      "command": "npx",
      "args": ["mercado-pago-mcp"],
      "env": {
        "MERCADOPAGO_ACCESS_TOKEN": "YOUR_ACCESS_TOKEN",
        "MERCADOPAGO_ENVIRONMENT": "sandbox"
      }
    }
  }
}
```

### Option 2: Global Install

```bash
npm install -g mercado-pago-mcp
```

Then in Claude Desktop config:
```json
{
  "mcpServers": {
    "mercado-pago": {
      "command": "mercado-pago-mcp",
      "env": {
        "MERCADOPAGO_ACCESS_TOKEN": "YOUR_ACCESS_TOKEN",
        "MERCADOPAGO_ENVIRONMENT": "sandbox"
      }
    }
  }
}
```

### Option 3: Local Install

```bash
git clone https://github.com/hdbookie/mercado-pago-mcp.git
cd mercado-pago-mcp
npm install
npm run build
```

Then in Claude Desktop config:
```json
{
  "mcpServers": {
    "mercado-pago": {
      "command": "node",
      "args": ["/path/to/mercado-pago-mcp/dist/index.js"],
      "env": {
        "MERCADOPAGO_ACCESS_TOKEN": "YOUR_ACCESS_TOKEN",
        "MERCADOPAGO_ENVIRONMENT": "sandbox"
      }
    }
  }
}
```

## Features

### 🎯 Core Capabilities (v1.0)

- **Payment Operations**
  - Create payments
  - Get payment details
  - Search payments with filters
  - Cancel pending payments
  
- **Refund Processing**
  - Full refunds
  - Partial refunds
  
- **Customer Management**
  - Create customers
  - Get customer details
  - Search customers
  
- **Payment Links**
  - Create checkout preferences
  - Generate payment links with custom URLs
  - Set expiration dates

### 🚀 Advanced Features (v2.0)

- **PIX Payments**
  - Create PIX payments with QR codes
  - Generate copy-paste PIX codes
  - Set custom expiration times
  
- **Subscription Management**
  - Create recurring subscriptions
  - Update/pause/cancel subscriptions
  - Manage subscription frequencies
  
- **Marketplace & Split Payments**
  - Split payments between multiple sellers
  - Configure platform fees
  - Manage disbursements
  
- **Card Management**
  - Save cards for future use
  - List customer's saved cards
  - Tokenized card payments
  
- **Batch Processing**
  - Create multiple payments in bulk
  - Batch status updates
  - Bulk refund processing
  
- **Reports & Analytics**
  - Generate payment reports
  - Export data in multiple formats
  - Date range filtering

### 💼 Business Features (v3.0)

- **Real-time Monitoring**
  - Monitor payment status changes
  - Configurable check intervals
  - Status change notifications
  
- **Fraud Detection**
  - Risk scoring system
  - Pattern analysis
  - Fraud indicators and recommendations
  
- **Analytics Dashboard**
  - Revenue metrics and KPIs
  - Payment method breakdowns
  - Customer insights and trends
  
- **Accounting Integration**
  - Export to QuickBooks format
  - Export to Xero format
  - Export to Sage format
  - CSV export for custom systems
  
- **Tax Calculations**
  - Brazilian tax calculations (ICMS, PIS, COFINS, ISS)
  - Regional tax rates by state
  - Product type tax differentiation
  
- **Payment Automation**
  - Automatic retry for failed payments
  - Payment reminder scheduling
  - Smart retry strategies
  
- **Testing Tools**
  - Webhook simulation
  - Sandbox/Production environment support

## ⚙️ Configuration

### Step 1: Get Mercado Pago Credentials

1. Go to [Mercado Pago Developers](https://www.mercadopago.com/developers)
2. Create an application
3. Get your Access Token:
   - **For Testing**: Use the TEST token (starts with `TEST-`)
   - **For Production**: Use the PRODUCTION token (starts with `APP_USR-`)

### Step 2: Configure Claude Desktop

Open your Claude Desktop configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Add the configuration from the Quick Install section above.

### Step 3: Restart Claude Desktop

After updating the configuration, restart Claude Desktop to load the MCP server.

## 🔐 Environment Configuration

### Staging/Sandbox (Recommended for Testing)
```json
{
  "MERCADOPAGO_ACCESS_TOKEN": "TEST-your-sandbox-token",
  "MERCADOPAGO_ENVIRONMENT": "sandbox"
}
```

### Production
```json
{
  "MERCADOPAGO_ACCESS_TOKEN": "APP_USR-your-production-token",
  "MERCADOPAGO_ENVIRONMENT": "production"
}
```

### Running Both Environments
You can run both staging and production simultaneously:

```json
{
  "mcpServers": {
    "mercado-pago-sandbox": {
      "command": "npx",
      "args": ["mercado-pago-mcp"],
      "env": {
        "MERCADOPAGO_ACCESS_TOKEN": "TEST-your-sandbox-token",
        "MERCADOPAGO_ENVIRONMENT": "sandbox"
      }
    },
    "mercado-pago-production": {
      "command": "npx",
      "args": ["mercado-pago-mcp"],
      "env": {
        "MERCADOPAGO_ACCESS_TOKEN": "APP_USR-your-production-token",
        "MERCADOPAGO_ENVIRONMENT": "production"
      }
    }
  }
}
```

## Available Tools (27+ Total)

### Core Payment Tools

#### create_payment
Create a new payment in Mercado Pago.

**Parameters:**
- `amount` (number, required): Payment amount
- `description` (string, required): Payment description
- `payerEmail` (string, required): Payer's email address
- `paymentMethodId` (string, required): Payment method (e.g., 'pix', 'credit_card')
- `installments` (number, optional): Number of installments for credit card

**Example:**
```json
{
  "amount": 100.50,
  "description": "Product purchase",
  "payerEmail": "customer@example.com",
  "paymentMethodId": "pix"
}
```

### get_payment
Get detailed information about a specific payment.

**Parameters:**
- `paymentId` (string, required): The payment ID to retrieve

### search_payments
Search for payments with various filters.

**Parameters:**
- `status` (string, optional): Payment status (approved, pending, rejected)
- `dateFrom` (string, optional): Start date in ISO format
- `dateTo` (string, optional): End date in ISO format
- `payerEmail` (string, optional): Filter by payer email
- `limit` (number, optional): Maximum results (default: 10)

### cancel_payment
Cancel a pending payment.

**Parameters:**
- `paymentId` (string, required): Payment ID to cancel

### create_refund
Create a full or partial refund for a payment.

**Parameters:**
- `paymentId` (string, required): Payment ID to refund
- `amount` (number, optional): Amount to refund (omit for full refund)

### create_customer
Create a new customer profile.

**Parameters:**
- `email` (string, required): Customer email
- `firstName` (string, optional): First name
- `lastName` (string, optional): Last name
- `phone` (string, optional): Phone number
- `identificationType` (string, optional): ID type (CPF, CNPJ, etc.)
- `identificationNumber` (string, optional): ID number

### get_customer
Get customer details by ID.

**Parameters:**
- `customerId` (string, required): Customer ID

### search_customers
Search for customers.

**Parameters:**
- `email` (string, optional): Filter by email
- `limit` (number, optional): Maximum results (default: 10)

### create_payment_link
Create a payment link (checkout preference).

**Parameters:**
- `title` (string, required): Product/service title
- `amount` (number, required): Price
- `quantity` (number, optional): Quantity (default: 1)
- `expirationDate` (string, optional): Expiration date in ISO format
- `successUrl` (string, optional): Redirect URL after success
- `failureUrl` (string, optional): Redirect URL after failure
- `pendingUrl` (string, optional): Redirect URL for pending

**Example:**
```json
{
  "title": "Premium Subscription",
  "amount": 29.99,
  "quantity": 1,
  "successUrl": "https://mysite.com/success",
  "failureUrl": "https://mysite.com/failure"
}
```

#### simulate_webhook
Simulate webhook notifications for testing.

**Parameters:**
- `type` (string, required): Webhook type
  - payment.created
  - payment.updated
  - payment.approved
  - payment.rejected
- `paymentId` (string, required): Payment ID for the webhook

### Advanced Payment Tools (v2.0+)

#### create_pix_payment
Create a PIX payment with QR code and copy-paste code.

**Parameters:**
- `amount` (number, required): Payment amount
- `description` (string, required): Payment description
- `payerEmail` (string, required): Payer's email
- `expirationMinutes` (number, optional): Minutes until expiration

#### create_subscription
Create a recurring subscription.

**Parameters:**
- `title` (string, required): Subscription title
- `amount` (number, required): Recurring amount
- `frequency` (number, required): Billing frequency
- `frequencyType` (string, required): 'days', 'months', or 'years'
- `payerEmail` (string, required): Subscriber's email

#### create_split_payment
Create marketplace split payments between multiple sellers.

**Parameters:**
- `amount` (number, required): Total amount
- `splits` (array, required): Array of split configurations with collectorId, amount, and fee

#### batch_create_payments
Create multiple payments in a single batch operation.

**Parameters:**
- `payments` (array, required): Array of payment objects
- `processInParallel` (boolean, optional): Process payments in parallel

### Business Intelligence Tools (v3.0+)

#### get_analytics_dashboard
Get comprehensive payment analytics and insights.

**Parameters:**
- `period` (string, optional): 'day', 'week', 'month', 'quarter', 'year'
- `metrics` (array, optional): Specific metrics to include

#### detect_fraud_risk
Analyze a payment for fraud risk indicators.

**Parameters:**
- `paymentId` (string, required): Payment ID to analyze
- `includeRecommendations` (boolean, optional): Include action recommendations

#### monitor_payment_status
Monitor a payment for status changes in real-time.

**Parameters:**
- `paymentId` (string, required): Payment ID to monitor
- `intervalSeconds` (number, optional): Check interval
- `maxChecks` (number, optional): Maximum number of checks

#### export_to_accounting
Export payment data to accounting software formats.

**Parameters:**
- `format` (string, required): 'quickbooks', 'xero', 'sage', or 'csv'
- `dateFrom` (string, required): Start date
- `dateTo` (string, required): End date
- `includeRefunds` (boolean, optional): Include refunded payments

#### calculate_taxes
Calculate Brazilian taxes for payments.

**Parameters:**
- `amount` (number, required): Base amount
- `region` (string, required): Brazilian state code
- `productType` (string, optional): 'physical', 'digital', or 'service'

#### schedule_payment_reminder
Schedule payment reminders for customers.

**Parameters:**
- `customerId` (string, required): Customer ID
- `amount` (number, required): Payment amount
- `dueDate` (string, required): Due date
- `reminderSchedule` (array, optional): Days before due date to send reminders

#### retry_failed_payment
Automatically retry a failed payment with smart strategies.

**Parameters:**
- `originalPaymentId` (string, required): Failed payment ID
- `updateAmount` (boolean, optional): Allow amount adjustment
- `useAlternativeMethod` (boolean, optional): Try alternative payment methods

## Usage Examples

### With Claude Desktop

Once configured, you can use natural language to interact with Mercado Pago:

```
"Create a payment for $50 for john@example.com using PIX"

"Search for all approved payments from the last week"

"Create a refund for payment ID 12345678"

"Generate a payment link for a $99 product that expires in 24 hours"
```

### Direct API Usage

```typescript
// Example: Create a payment
const payment = await createPayment({
  amount: 100.00,
  description: "Test payment",
  payerEmail: "test@example.com",
  paymentMethodId: "pix"
});

// Example: Process a refund
const refund = await createRefund({
  paymentId: "12345678",
  amount: 50.00  // Partial refund
});
```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Debug mode
npm run inspect
```

## Testing

The server includes sandbox support for safe testing:

1. Use sandbox Access Token
2. Set `MERCADOPAGO_ENVIRONMENT=sandbox`
3. Use test credit cards provided by Mercado Pago
4. Simulate webhooks with the `simulate_webhook` tool

### Test Credit Cards (Sandbox)

- **Approved**: 5031 4332 1540 6351
- **Pending**: 5031 4332 1540 6351
- **Rejected**: 5031 4332 1540 6351

## Security Considerations

- **Never commit your Access Token** to version control
- Use environment variables for sensitive data
- Use sandbox environment for development
- Implement proper error handling in production
- Consider rate limiting for production deployments

## Webhook Integration

For production use, set up webhooks in your Mercado Pago dashboard:

1. Go to Your Application > Webhooks
2. Add your webhook URL
3. Select events to receive
4. Use the `simulate_webhook` tool for testing

## Troubleshooting

### Common Issues

**"Invalid Access Token"**
- Verify your token is correct
- Check if using sandbox vs production token
- Ensure token has necessary permissions

**"Payment method not available"**
- Check if payment method is enabled in your account
- Verify country/region support

**"Customer already exists"**
- Use search_customers to find existing customer
- Update existing customer instead of creating new

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues and questions:
- Open an issue on GitHub
- Check Mercado Pago documentation
- Contact Mercado Pago support for API-specific issues

## Roadmap

### ✅ Completed (v2.0 - v3.0)
- [x] PIX payments with QR codes
- [x] Subscription management
- [x] Marketplace/split payments
- [x] Saved cards management
- [x] Batch payment processing
- [x] Advanced reporting and analytics
- [x] Fraud detection system
- [x] Payment status monitoring
- [x] Accounting software exports (QuickBooks, Xero, Sage)
- [x] Brazilian tax calculations
- [x] Payment retry automation
- [x] Payment reminder scheduling

### 🚧 Planned Features
- [ ] Multi-language support (Portuguese, Spanish, English)
- [ ] Rate limiting and caching optimization
- [ ] Boleto bancário support
- [ ] Advanced webhook management
- [ ] Payment dispute handling
- [ ] Multi-currency conversion
- [ ] A/B testing for payment methods
- [ ] Machine learning fraud detection

---

Built with ❤️ for the developer community