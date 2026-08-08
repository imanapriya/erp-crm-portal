CREATE TYPE "public"."challan_status" AS ENUM('DRAFT', 'CONFIRMED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."customer_status" AS ENUM('LEAD', 'ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."customer_type" AS ENUM('RETAIL', 'WHOLESALE', 'DISTRIBUTOR');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('IN', 'OUT');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS');--> statement-breakpoint
CREATE TABLE "challan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challan_id" uuid NOT NULL,
	"product_id" uuid,
	"product_name_snapshot" varchar(255) NOT NULL,
	"product_sku_snapshot" varchar(64) NOT NULL,
	"unit_price_snapshot" numeric(12, 2) NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"mobile" varchar(32) NOT NULL,
	"email" varchar(255),
	"business_name" varchar(255),
	"gst_number" varchar(32),
	"customer_type" "customer_type" NOT NULL,
	"address" text,
	"status" "customer_status" DEFAULT 'LEAD' NOT NULL,
	"follow_up_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"note" text NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"sku" varchar(64) NOT NULL,
	"category" varchar(128),
	"unit_price" numeric(12, 2) NOT NULL,
	"current_stock" integer DEFAULT 0 NOT NULL,
	"min_stock_alert" integer DEFAULT 0 NOT NULL,
	"location" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "sales_challans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challan_number" varchar(64) NOT NULL,
	"customer_id" uuid NOT NULL,
	"total_quantity" integer NOT NULL,
	"status" "challan_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sales_challans_challan_number_unique" UNIQUE("challan_number")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"movement_type" "movement_type" NOT NULL,
	"reason" text NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"role" "role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "challan_items" ADD CONSTRAINT "challan_items_challan_id_sales_challans_id_fk" FOREIGN KEY ("challan_id") REFERENCES "public"."sales_challans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challan_items" ADD CONSTRAINT "challan_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_challans" ADD CONSTRAINT "sales_challans_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_challans" ADD CONSTRAINT "sales_challans_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;