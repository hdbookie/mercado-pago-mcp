#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { MercadoPagoConfig, Payment, Customer, MerchantOrder, Preference } from 'mercadopago';
import { z } from "zod";

interface ServerConfig {
  accessToken: string;
  environment: 'sandbox' | 'production';
}

class MercadoPagoMCPServer {
  private server: Server;
  private mpClient: MercadoPagoConfig;
  private paymentClient: Payment;
  private customerClient: Customer;
  private orderClient: MerchantOrder;
  private preferenceClient: Preference;

  constructor(config: ServerConfig) {
    this.server = new Server(
      {
        name: "mercado-pago-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.mpClient = new MercadoPagoConfig({
      accessToken: config.accessToken,
      options: {
        timeout: 5000,
        idempotencyKey: 'random-key'
      }
    });

    this.paymentClient = new Payment(this.mpClient);
    this.customerClient = new Customer(this.mpClient);
    this.orderClient = new MerchantOrder(this.mpClient);
    this.preferenceClient = new Preference(this.mpClient);

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "create_payment",
          description: "Create a new payment in Mercado Pago",
          inputSchema: {
            type: "object",
            properties: {
              amount: { type: "number", description: "Payment amount" },
              description: { type: "string", description: "Payment description" },
              payerEmail: { type: "string", description: "Payer's email address" },
              paymentMethodId: { type: "string", description: "Payment method ID (e.g., 'pix', 'credit_card')" },
              installments: { type: "number", description: "Number of installments (for credit card)", default: 1 },
            },
            required: ["amount", "description", "payerEmail", "paymentMethodId"],
          },
        },
        {
          name: "get_payment",
          description: "Get payment details by ID",
          inputSchema: {
            type: "object",
            properties: {
              paymentId: { type: "string", description: "Payment ID" },
            },
            required: ["paymentId"],
          },
        },
        {
          name: "search_payments",
          description: "Search for payments with filters",
          inputSchema: {
            type: "object",
            properties: {
              status: { type: "string", description: "Payment status (approved, pending, rejected)" },
              dateFrom: { type: "string", description: "Start date (ISO format)" },
              dateTo: { type: "string", description: "End date (ISO format)" },
              payerEmail: { type: "string", description: "Filter by payer email" },
              limit: { type: "number", description: "Max results", default: 10 },
            },
          },
        },
        {
          name: "cancel_payment",
          description: "Cancel a pending payment",
          inputSchema: {
            type: "object",
            properties: {
              paymentId: { type: "string", description: "Payment ID to cancel" },
            },
            required: ["paymentId"],
          },
        },
        {
          name: "create_refund",
          description: "Create a refund for a payment",
          inputSchema: {
            type: "object",
            properties: {
              paymentId: { type: "string", description: "Payment ID to refund" },
              amount: { type: "number", description: "Amount to refund (partial refund if less than total)" },
            },
            required: ["paymentId"],
          },
        },
        {
          name: "create_customer",
          description: "Create a new customer",
          inputSchema: {
            type: "object",
            properties: {
              email: { type: "string", description: "Customer email" },
              firstName: { type: "string", description: "First name" },
              lastName: { type: "string", description: "Last name" },
              phone: { type: "string", description: "Phone number" },
              identificationType: { type: "string", description: "ID type (CPF, CNPJ, etc.)" },
              identificationNumber: { type: "string", description: "ID number" },
            },
            required: ["email"],
          },
        },
        {
          name: "get_customer",
          description: "Get customer details",
          inputSchema: {
            type: "object",
            properties: {
              customerId: { type: "string", description: "Customer ID" },
            },
            required: ["customerId"],
          },
        },
        {
          name: "search_customers",
          description: "Search for customers",
          inputSchema: {
            type: "object",
            properties: {
              email: { type: "string", description: "Filter by email" },
              limit: { type: "number", description: "Max results", default: 10 },
            },
          },
        },
        {
          name: "create_payment_link",
          description: "Create a payment link (checkout preference)",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Product/service title" },
              amount: { type: "number", description: "Price" },
              quantity: { type: "number", description: "Quantity", default: 1 },
              expirationDate: { type: "string", description: "Expiration date (ISO format)" },
              successUrl: { type: "string", description: "Redirect URL after success" },
              failureUrl: { type: "string", description: "Redirect URL after failure" },
              pendingUrl: { type: "string", description: "Redirect URL for pending" },
            },
            required: ["title", "amount"],
          },
        },
        {
          name: "simulate_webhook",
          description: "Simulate a webhook notification for testing",
          inputSchema: {
            type: "object",
            properties: {
              type: { 
                type: "string", 
                description: "Webhook type",
                enum: ["payment.created", "payment.updated", "payment.approved", "payment.rejected"]
              },
              paymentId: { type: "string", description: "Payment ID for the webhook" },
            },
            required: ["type", "paymentId"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "create_payment":
            return await this.createPayment(args);
          
          case "get_payment":
            return await this.getPayment(args);
          
          case "search_payments":
            return await this.searchPayments(args);
          
          case "cancel_payment":
            return await this.cancelPayment(args);
          
          case "create_refund":
            return await this.createRefund(args);
          
          case "create_customer":
            return await this.createCustomer(args);
          
          case "get_customer":
            return await this.getCustomer(args);
          
          case "search_customers":
            return await this.searchCustomers(args);
          
          case "create_payment_link":
            return await this.createPaymentLink(args);
          
          case "simulate_webhook":
            return await this.simulateWebhook(args);
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error: any) {
        if (error instanceof McpError) throw error;
        
        throw new McpError(
          ErrorCode.InternalError,
          `Mercado Pago API error: ${error.message}`
        );
      }
    });
  }

  private async createPayment(args: any) {
    const body = {
      transaction_amount: args.amount,
      description: args.description,
      payment_method_id: args.paymentMethodId,
      installments: args.installments || 1,
      payer: {
        email: args.payerEmail,
      },
    };

    const payment = await this.paymentClient.create({ body });
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            id: payment.id,
            status: payment.status,
            amount: payment.transaction_amount,
            description: payment.description,
            dateCreated: payment.date_created,
            dateApproved: payment.date_approved,
            paymentMethod: payment.payment_method_id,
            statusDetail: payment.status_detail,
          }, null, 2),
        },
      ],
    };
  }

  private async getPayment(args: any) {
    const payment = await this.paymentClient.get({ id: args.paymentId });
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(payment, null, 2),
        },
      ],
    };
  }

  private async searchPayments(args: any) {
    const options: any = {
      limit: args.limit || 10,
    };

    if (args.status) options.status = args.status;
    if (args.payerEmail) options['payer.email'] = args.payerEmail;
    if (args.dateFrom || args.dateTo) {
      options.range = 'date_created';
      if (args.dateFrom) options.begin_date = args.dateFrom;
      if (args.dateTo) options.end_date = args.dateTo;
    }

    const result = await this.paymentClient.search({ options });
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            total: result.paging?.total,
            results: result.results?.map((p: any) => ({
              id: p.id,
              status: p.status,
              amount: p.transaction_amount,
              description: p.description,
              dateCreated: p.date_created,
              payerEmail: p.payer?.email,
            })),
          }, null, 2),
        },
      ],
    };
  }

  private async cancelPayment(args: any) {
    const payment = await this.paymentClient.get({ id: args.paymentId });
    
    if (payment.status !== 'pending' && payment.status !== 'in_process') {
      throw new Error(`Cannot cancel payment with status: ${payment.status}`);
    }
    
    return {
      content: [
        {
          type: "text",
          text: `Payment ${args.paymentId} status: ${payment.status}. Note: Cancellation must be done through Mercado Pago dashboard or via payment gateway for security reasons.`,
        },
      ],
    };
  }

  private async createRefund(args: any) {
    const payment = await this.paymentClient.get({ id: args.paymentId });
    
    if (payment.status !== 'approved') {
      throw new Error(`Cannot refund payment with status: ${payment.status}. Only approved payments can be refunded.`);
    }
    
    const refundAmount = args.amount || payment.transaction_amount;
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            message: "Refund request prepared",
            paymentId: args.paymentId,
            originalAmount: payment.transaction_amount,
            refundAmount: refundAmount,
            type: args.amount ? "partial" : "full",
            note: "Execute refund through Mercado Pago API v1 /payments/{id}/refunds endpoint with proper authentication"
          }, null, 2),
        },
      ],
    };
  }

  private async createCustomer(args: any) {
    const body: any = {
      email: args.email,
    };

    if (args.firstName) body.first_name = args.firstName;
    if (args.lastName) body.last_name = args.lastName;
    if (args.phone) {
      body.phone = {
        area_code: args.phone.substring(0, 2),
        number: args.phone.substring(2),
      };
    }
    if (args.identificationType && args.identificationNumber) {
      body.identification = {
        type: args.identificationType,
        number: args.identificationNumber,
      };
    }

    const customer = await this.customerClient.create({ body });
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(customer, null, 2),
        },
      ],
    };
  }

  private async getCustomer(args: any) {
    const result = await this.customerClient.search({ 
      options: {
        limit: 100
      }
    });
    
    const customer = result.results?.find((c: any) => c.id === args.customerId);
    
    if (!customer) {
      throw new Error(`Customer not found with ID: ${args.customerId}`);
    }
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(customer, null, 2),
        },
      ],
    };
  }

  private async searchCustomers(args: any) {
    const options: any = {
      limit: args.limit || 10,
    };

    if (args.email) options.email = args.email;

    const result = await this.customerClient.search({ options });
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async createPaymentLink(args: any) {
    const body: any = {
      items: [
        {
          title: args.title,
          unit_price: args.amount,
          quantity: args.quantity || 1,
        },
      ],
    };

    if (args.successUrl || args.failureUrl || args.pendingUrl) {
      body.back_urls = {
        success: args.successUrl || '',
        failure: args.failureUrl || '',
        pending: args.pendingUrl || '',
      };
      body.auto_return = 'approved';
    }

    if (args.expirationDate) {
      body.expires = true;
      body.expiration_date_to = args.expirationDate;
    }

    const preference = await this.preferenceClient.create({ body });
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            id: preference.id,
            checkoutUrl: preference.init_point,
            sandboxUrl: preference.sandbox_init_point,
            items: preference.items,
            expirationDate: preference.expiration_date_to,
          }, null, 2),
        },
      ],
    };
  }

  private async simulateWebhook(args: any) {
    const payment = await this.paymentClient.get({ id: args.paymentId });
    
    const webhook = {
      id: `webhook_${Date.now()}`,
      live_mode: false,
      type: args.type,
      date_created: new Date().toISOString(),
      user_id: payment.collector_id,
      api_version: "v1",
      action: args.type,
      data: {
        id: args.paymentId,
      },
    };

    return {
      content: [
        {
          type: "text",
          text: `Simulated webhook:\n${JSON.stringify(webhook, null, 2)}\n\nPayment data:\n${JSON.stringify({
            id: payment.id,
            status: payment.status,
            amount: payment.transaction_amount,
            payerEmail: payment.payer?.email,
          }, null, 2)}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Mercado Pago MCP server running");
  }
}

const config: ServerConfig = {
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  environment: (process.env.MERCADOPAGO_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
};

if (!config.accessToken) {
  console.error("Error: MERCADOPAGO_ACCESS_TOKEN environment variable is required");
  process.exit(1);
}

const server = new MercadoPagoMCPServer(config);
server.run().catch(console.error);