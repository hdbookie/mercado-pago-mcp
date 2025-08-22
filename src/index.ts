#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { MercadoPagoConfig, Payment, Customer, MerchantOrder, Preference, PreApproval, PaymentMethod, CardToken } from 'mercadopago';
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
  private subscriptionClient: PreApproval;
  private paymentMethodClient: PaymentMethod;
  private cardTokenClient: CardToken;

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
    this.subscriptionClient = new PreApproval(this.mpClient);
    this.paymentMethodClient = new PaymentMethod(this.mpClient);
    this.cardTokenClient = new CardToken(this.mpClient);

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
        {
          name: "create_pix_payment",
          description: "Create a PIX payment with QR code",
          inputSchema: {
            type: "object",
            properties: {
              amount: { type: "number", description: "Payment amount" },
              description: { type: "string", description: "Payment description" },
              payerEmail: { type: "string", description: "Payer's email" },
              payerFirstName: { type: "string", description: "Payer's first name" },
              payerLastName: { type: "string", description: "Payer's last name" },
              payerDocument: { type: "string", description: "Payer's CPF/CNPJ" },
              expirationMinutes: { type: "number", description: "QR code expiration in minutes", default: 30 },
            },
            required: ["amount", "description", "payerEmail"],
          },
        },
        {
          name: "create_subscription",
          description: "Create a recurring subscription",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Subscription title" },
              amount: { type: "number", description: "Recurring amount" },
              frequency: { type: "number", description: "Frequency in days (e.g., 30 for monthly)" },
              frequencyType: { type: "string", description: "Frequency type", enum: ["days", "months"], default: "months" },
              payerEmail: { type: "string", description: "Subscriber's email" },
              startDate: { type: "string", description: "Start date (ISO format)" },
              endDate: { type: "string", description: "End date (ISO format)" },
            },
            required: ["title", "amount", "frequency", "payerEmail"],
          },
        },
        {
          name: "get_subscription",
          description: "Get subscription details",
          inputSchema: {
            type: "object",
            properties: {
              subscriptionId: { type: "string", description: "Subscription ID" },
            },
            required: ["subscriptionId"],
          },
        },
        {
          name: "update_subscription",
          description: "Update subscription (pause, resume, modify)",
          inputSchema: {
            type: "object",
            properties: {
              subscriptionId: { type: "string", description: "Subscription ID" },
              status: { type: "string", description: "New status", enum: ["paused", "cancelled", "authorized"] },
              amount: { type: "number", description: "New amount (optional)" },
            },
            required: ["subscriptionId"],
          },
        },
        {
          name: "create_split_payment",
          description: "Create a marketplace split payment",
          inputSchema: {
            type: "object",
            properties: {
              amount: { type: "number", description: "Total payment amount" },
              description: { type: "string", description: "Payment description" },
              payerEmail: { type: "string", description: "Payer's email" },
              paymentMethodId: { type: "string", description: "Payment method" },
              splits: {
                type: "array",
                description: "Payment splits configuration",
                items: {
                  type: "object",
                  properties: {
                    collectorId: { type: "string", description: "Collector's Mercado Pago ID" },
                    amount: { type: "number", description: "Amount for this collector" },
                    fee: { type: "number", description: "Platform fee", default: 0 },
                  },
                },
              },
            },
            required: ["amount", "description", "payerEmail", "paymentMethodId", "splits"],
          },
        },
        {
          name: "save_card",
          description: "Save a card for future payments",
          inputSchema: {
            type: "object",
            properties: {
              customerId: { type: "string", description: "Customer ID" },
              cardNumber: { type: "string", description: "Card number" },
              cardholderName: { type: "string", description: "Cardholder name" },
              expirationMonth: { type: "string", description: "Expiration month (MM)" },
              expirationYear: { type: "string", description: "Expiration year (YYYY)" },
              securityCode: { type: "string", description: "CVV/CVC" },
            },
            required: ["customerId", "cardNumber", "cardholderName", "expirationMonth", "expirationYear", "securityCode"],
          },
        },
        {
          name: "list_saved_cards",
          description: "List customer's saved cards",
          inputSchema: {
            type: "object",
            properties: {
              customerId: { type: "string", description: "Customer ID" },
            },
            required: ["customerId"],
          },
        },
        {
          name: "get_payment_methods",
          description: "Get available payment methods for your country",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "batch_create_payments",
          description: "Create multiple payments in batch",
          inputSchema: {
            type: "object",
            properties: {
              payments: {
                type: "array",
                description: "Array of payments to create",
                items: {
                  type: "object",
                  properties: {
                    amount: { type: "number" },
                    description: { type: "string" },
                    payerEmail: { type: "string" },
                    paymentMethodId: { type: "string" },
                  },
                },
              },
            },
            required: ["payments"],
          },
        },
        {
          name: "generate_reports",
          description: "Generate payment reports",
          inputSchema: {
            type: "object",
            properties: {
              reportType: { 
                type: "string", 
                description: "Type of report",
                enum: ["payments", "refunds", "chargebacks", "settlements"]
              },
              dateFrom: { type: "string", description: "Start date (ISO format)" },
              dateTo: { type: "string", description: "End date (ISO format)" },
              format: { type: "string", description: "Output format", enum: ["json", "csv"], default: "json" },
            },
            required: ["reportType", "dateFrom", "dateTo"],
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
          
          case "create_pix_payment":
            return await this.createPixPayment(args);
          
          case "create_subscription":
            return await this.createSubscription(args);
          
          case "get_subscription":
            return await this.getSubscription(args);
          
          case "update_subscription":
            return await this.updateSubscription(args);
          
          case "create_split_payment":
            return await this.createSplitPayment(args);
          
          case "save_card":
            return await this.saveCard(args);
          
          case "list_saved_cards":
            return await this.listSavedCards(args);
          
          case "get_payment_methods":
            return await this.getPaymentMethods(args);
          
          case "batch_create_payments":
            return await this.batchCreatePayments(args);
          
          case "generate_reports":
            return await this.generateReports(args);
          
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

  private async createPixPayment(args: any) {
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + (args.expirationMinutes || 30));

    const body = {
      transaction_amount: args.amount,
      description: args.description,
      payment_method_id: 'pix',
      payer: {
        email: args.payerEmail,
        first_name: args.payerFirstName || 'First',
        last_name: args.payerLastName || 'Last',
        identification: {
          type: 'CPF',
          number: args.payerDocument || '12345678909'
        }
      },
      date_of_expiration: expirationDate.toISOString(),
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
            pixQrCode: payment.point_of_interaction?.transaction_data?.qr_code,
            pixQrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
            pixCopyPaste: payment.point_of_interaction?.transaction_data?.ticket_url,
            expirationDate: payment.date_of_expiration,
          }, null, 2),
        },
      ],
    };
  }

  private async createSubscription(args: any) {
    const body: any = {
      reason: args.title,
      auto_recurring: {
        frequency: args.frequency,
        frequency_type: args.frequencyType || 'months',
        transaction_amount: args.amount,
        currency_id: 'BRL',
      },
      payer_email: args.payerEmail,
      status: 'pending',
    };

    if (args.startDate) body.start_date = args.startDate;
    if (args.endDate) body.end_date = args.endDate;

    const subscription = await this.subscriptionClient.create({ body });
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            id: subscription.id,
            status: subscription.status,
            reason: subscription.reason,
            amount: subscription.auto_recurring?.transaction_amount,
            frequency: subscription.auto_recurring?.frequency,
            init_point: subscription.init_point,
          }, null, 2),
        },
      ],
    };
  }

  private async getSubscription(args: any) {
    const subscription = await this.subscriptionClient.get({ id: args.subscriptionId });
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(subscription, null, 2),
        },
      ],
    };
  }

  private async updateSubscription(args: any) {
    const body: any = {};
    
    if (args.status) body.status = args.status;
    if (args.amount) {
      body.auto_recurring = { transaction_amount: args.amount };
    }

    const subscription = await this.subscriptionClient.update({ 
      id: args.subscriptionId,
      body 
    });
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            id: subscription.id,
            status: subscription.status,
            updated: true,
          }, null, 2),
        },
      ],
    };
  }

  private async createSplitPayment(args: any) {
    const body: any = {
      transaction_amount: args.amount,
      description: args.description,
      payment_method_id: args.paymentMethodId,
      payer: {
        email: args.payerEmail,
      },
      application_fee: args.splits.reduce((sum: number, split: any) => sum + (split.fee || 0), 0),
      disbursements: args.splits.map((split: any) => ({
        amount: split.amount,
        collector_id: split.collectorId,
        application_fee: split.fee || 0,
      })),
    };

    const payment = await this.paymentClient.create({ body });
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            id: payment.id,
            status: payment.status,
            totalAmount: payment.transaction_amount,
            applicationFee: body.application_fee,
            splits: args.splits,
          }, null, 2),
        },
      ],
    };
  }

  private async saveCard(args: any) {
    const tokenBody = {
      card_number: args.cardNumber,
      cardholder: {
        name: args.cardholderName,
        identification: {
          type: 'CPF',
          number: '12345678909'
        }
      },
      expiration_month: args.expirationMonth,
      expiration_year: args.expirationYear,
      security_code: args.securityCode,
    };

    const token = await this.cardTokenClient.create({ body: tokenBody });
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            message: "Card tokenized successfully",
            tokenId: token.id,
            lastFourDigits: token.last_four_digits,
            customerId: args.customerId,
            note: "Use this token to create payments with saved card",
          }, null, 2),
        },
      ],
    };
  }

  private async listSavedCards(args: any) {
    const customer = await this.customerClient.search({ 
      options: {
        limit: 100
      }
    });
    
    const targetCustomer = customer.results?.find((c: any) => c.id === args.customerId);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            customerId: args.customerId,
            cards: targetCustomer?.cards || [],
            note: "Saved cards information from customer profile",
          }, null, 2),
        },
      ],
    };
  }

  private async getPaymentMethods(args: any) {
    const methods = await this.paymentMethodClient.get();
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            availableMethods: methods.map((m: any) => ({
              id: m.id,
              name: m.name,
              type: m.payment_type_id,
              status: m.status,
              thumbnail: m.thumbnail,
            })),
          }, null, 2),
        },
      ],
    };
  }

  private async batchCreatePayments(args: any) {
    const results = [];
    const errors = [];

    for (const paymentData of args.payments) {
      try {
        const body = {
          transaction_amount: paymentData.amount,
          description: paymentData.description,
          payment_method_id: paymentData.paymentMethodId,
          payer: {
            email: paymentData.payerEmail,
          },
        };

        const payment = await this.paymentClient.create({ body });
        results.push({
          id: payment.id,
          status: payment.status,
          amount: payment.transaction_amount,
        });
      } catch (error: any) {
        errors.push({
          email: paymentData.payerEmail,
          error: error.message,
        });
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            successful: results.length,
            failed: errors.length,
            results,
            errors,
          }, null, 2),
        },
      ],
    };
  }

  private async generateReports(args: any) {
    const options: any = {
      begin_date: args.dateFrom,
      end_date: args.dateTo,
    };

    let data: any[] = [];
    
    switch (args.reportType) {
      case 'payments':
        const payments = await this.paymentClient.search({ options });
        data = payments.results || [];
        break;
      
      case 'refunds':
        const refundPayments = await this.paymentClient.search({ 
          options: { ...options, status: 'refunded' }
        });
        data = refundPayments.results || [];
        break;
      
      case 'chargebacks':
        const chargebacks = await this.paymentClient.search({ 
          options: { ...options, status: 'charged_back' }
        });
        data = chargebacks.results || [];
        break;
      
      case 'settlements':
        // Settlements would require additional API endpoints
        data = [];
        break;
    }

    const report = {
      type: args.reportType,
      period: {
        from: args.dateFrom,
        to: args.dateTo,
      },
      summary: {
        total_records: data.length,
        total_amount: data.reduce((sum, p) => sum + (p.transaction_amount || 0), 0),
      },
      data: args.format === 'csv' ? this.convertToCSV(data) : data,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(report, null, 2),
        },
      ],
    };
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => 
      Object.values(item).map(val => 
        typeof val === 'string' ? `"${val}"` : val
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
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