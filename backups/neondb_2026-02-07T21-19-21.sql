--
-- PostgreSQL database dump
--

\restrict 3b67B9U1lhsRhO5zmYqJZHHduemIitr3opBhCxSrM5JvebqavTziEaLf1peTU4s

-- Dumped from database version 17.7 (bdd1736)
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO neondb_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: neondb_owner
--

COMMENT ON SCHEMA public IS '';


--
-- Name: BudgetCategoryType; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."BudgetCategoryType" AS ENUM (
    'INCOME',
    'EXPENSE',
    'BOTH'
);


ALTER TYPE public."BudgetCategoryType" OWNER TO neondb_owner;

--
-- Name: BudgetStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."BudgetStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'CLOSED'
);


ALTER TYPE public."BudgetStatus" OWNER TO neondb_owner;

--
-- Name: CampoutAdultRole; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."CampoutAdultRole" AS ENUM (
    'ORGANIZER',
    'ATTENDEE'
);


ALTER TYPE public."CampoutAdultRole" OWNER TO neondb_owner;

--
-- Name: CampoutStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."CampoutStatus" AS ENUM (
    'DRAFT',
    'OPEN',
    'READY_FOR_PAYMENT',
    'CLOSED'
);


ALTER TYPE public."CampoutStatus" OWNER TO neondb_owner;

--
-- Name: FundraisingStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."FundraisingStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'CLOSED'
);


ALTER TYPE public."FundraisingStatus" OWNER TO neondb_owner;

--
-- Name: FundraisingType; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."FundraisingType" AS ENUM (
    'GENERAL',
    'PRODUCT_SALE'
);


ALTER TYPE public."FundraisingType" OWNER TO neondb_owner;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."NotificationType" AS ENUM (
    'SYSTEM',
    'ALERT',
    'INFO',
    'ACTION_REQUIRED'
);


ALTER TYPE public."NotificationType" OWNER TO neondb_owner;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."Role" AS ENUM (
    'PLATFORM_ADMIN',
    'ADMIN',
    'FINANCIER',
    'LEADER',
    'SCOUT',
    'PARENT'
);


ALTER TYPE public."Role" OWNER TO neondb_owner;

--
-- Name: ScoutStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."ScoutStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


ALTER TYPE public."ScoutStatus" OWNER TO neondb_owner;

--
-- Name: TransactionStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."TransactionStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."TransactionStatus" OWNER TO neondb_owner;

--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."TransactionType" AS ENUM (
    'REGISTRATION_INCOME',
    'FUNDRAISING_INCOME',
    'DONATION_IN',
    'EXPENSE',
    'CAMP_TRANSFER',
    'REIMBURSEMENT',
    'DUES',
    'IBA_RECLAIM',
    'EVENT_PAYMENT',
    'TROOP_PAYMENT',
    'IBA_DEPOSIT',
    'SCOUT_CASH_TURN_IN',
    'INTERNAL_TRANSFER'
);


ALTER TYPE public."TransactionType" OWNER TO neondb_owner;

--
-- Name: TroopStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."TroopStatus" AS ENUM (
    'PENDING_PAYMENT',
    'ACTIVE',
    'PAUSED',
    'GRACE_PERIOD',
    'PENDING_DELETION'
);


ALTER TYPE public."TroopStatus" OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AdminAuditLog; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."AdminAuditLog" (
    id text NOT NULL,
    "adminId" text NOT NULL,
    action text NOT NULL,
    "targetId" text,
    details jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AdminAuditLog" OWNER TO neondb_owner;

--
-- Name: AdultExpense; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."AdultExpense" (
    id text NOT NULL,
    "campoutId" text NOT NULL,
    "adultId" text NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text NOT NULL,
    category text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isReimbursed" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."AdultExpense" OWNER TO neondb_owner;

--
-- Name: Budget; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Budget" (
    id text NOT NULL,
    "troopId" text NOT NULL,
    year text NOT NULL,
    status public."BudgetStatus" DEFAULT 'DRAFT'::public."BudgetStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "annualDuesAmount" numeric(10,2) DEFAULT 150.00 NOT NULL
);


ALTER TABLE public."Budget" OWNER TO neondb_owner;

--
-- Name: BudgetCategory; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."BudgetCategory" (
    id text NOT NULL,
    "budgetId" text NOT NULL,
    name text NOT NULL,
    type public."BudgetCategoryType" NOT NULL,
    "plannedIncome" numeric(10,2) DEFAULT 0 NOT NULL,
    "plannedExpense" numeric(10,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public."BudgetCategory" OWNER TO neondb_owner;

--
-- Name: CampaignProduct; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."CampaignProduct" (
    id text NOT NULL,
    "campaignId" text NOT NULL,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    cost numeric(10,2) NOT NULL,
    "ibaAmount" numeric(10,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CampaignProduct" OWNER TO neondb_owner;

--
-- Name: Campout; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Campout" (
    id text NOT NULL,
    "troopId" text NOT NULL,
    name text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    location text,
    "estimatedCost" numeric(10,2),
    status public."CampoutStatus" DEFAULT 'DRAFT'::public."CampoutStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Campout" OWNER TO neondb_owner;

--
-- Name: CampoutAdult; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."CampoutAdult" (
    "campoutId" text NOT NULL,
    "adultId" text NOT NULL,
    role public."CampoutAdultRole" DEFAULT 'ORGANIZER'::public."CampoutAdultRole" NOT NULL
);


ALTER TABLE public."CampoutAdult" OWNER TO neondb_owner;

--
-- Name: CampoutScout; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."CampoutScout" (
    "campoutId" text NOT NULL,
    "scoutId" text NOT NULL,
    "registeredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."CampoutScout" OWNER TO neondb_owner;

--
-- Name: DirectSalesGroup; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."DirectSalesGroup" (
    id text NOT NULL,
    "campaignId" text NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DirectSalesGroup" OWNER TO neondb_owner;

--
-- Name: DirectSalesGroupItem; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."DirectSalesGroupItem" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "inventoryId" text NOT NULL,
    quantity integer NOT NULL,
    "soldCount" integer DEFAULT 0 NOT NULL,
    "amountCollected" numeric(10,2) DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DirectSalesGroupItem" OWNER TO neondb_owner;

--
-- Name: DirectSalesGroupVolunteer; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."DirectSalesGroupVolunteer" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "scoutId" text,
    "userId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DirectSalesGroupVolunteer" OWNER TO neondb_owner;

--
-- Name: DirectSalesInventory; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."DirectSalesInventory" (
    id text NOT NULL,
    "campaignId" text NOT NULL,
    "productId" text NOT NULL,
    quantity integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DirectSalesInventory" OWNER TO neondb_owner;

--
-- Name: FundraisingCampaign; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."FundraisingCampaign" (
    id text NOT NULL,
    "troopId" text NOT NULL,
    name text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    goal numeric(10,2) NOT NULL,
    "isComplianceApproved" boolean DEFAULT false NOT NULL,
    "ibaPercentage" integer DEFAULT 0 NOT NULL,
    status public."FundraisingStatus" DEFAULT 'DRAFT'::public."FundraisingStatus" NOT NULL,
    type public."FundraisingType" DEFAULT 'GENERAL'::public."FundraisingType" NOT NULL,
    description text,
    "ticketPrice" numeric(10,2),
    "volunteerPercentage" numeric(5,2) DEFAULT 0,
    "sendThankYou" boolean DEFAULT false NOT NULL,
    "thankYouTemplate" text,
    "sendEventInvite" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."FundraisingCampaign" OWNER TO neondb_owner;

--
-- Name: FundraisingOrder; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."FundraisingOrder" (
    id text NOT NULL,
    "campaignId" text NOT NULL,
    "scoutId" text NOT NULL,
    "productId" text,
    "customerName" text NOT NULL,
    "customerEmail" text,
    quantity integer NOT NULL,
    "amountPaid" numeric(10,2) DEFAULT 0 NOT NULL,
    delivered boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FundraisingOrder" OWNER TO neondb_owner;

--
-- Name: FundraisingSale; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."FundraisingSale" (
    id text NOT NULL,
    "campaignId" text NOT NULL,
    "scoutId" text NOT NULL,
    quantity integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FundraisingSale" OWNER TO neondb_owner;

--
-- Name: FundraisingVolunteer; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."FundraisingVolunteer" (
    id text NOT NULL,
    "campaignId" text NOT NULL,
    "scoutId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."FundraisingVolunteer" OWNER TO neondb_owner;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type public."NotificationType" DEFAULT 'INFO'::public."NotificationType" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    read boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Notification" OWNER TO neondb_owner;

--
-- Name: ParentScout; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."ParentScout" (
    "parentId" text NOT NULL,
    "scoutId" text NOT NULL
);


ALTER TABLE public."ParentScout" OWNER TO neondb_owner;

--
-- Name: PendingRegistration; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."PendingRegistration" (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    "troopName" text NOT NULL,
    "troopSlug" text NOT NULL,
    council text NOT NULL,
    district text,
    "passwordHash" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "stripeSessionId" text
);


ALTER TABLE public."PendingRegistration" OWNER TO neondb_owner;

--
-- Name: Scout; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Scout" (
    id text NOT NULL,
    "troopId" text NOT NULL,
    name text NOT NULL,
    age integer,
    "ibaBalance" numeric(10,2) DEFAULT 0.00 NOT NULL,
    status public."ScoutStatus" DEFAULT 'ACTIVE'::public."ScoutStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "userId" text,
    email text
);


ALTER TABLE public."Scout" OWNER TO neondb_owner;

--
-- Name: Subscription; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Subscription" (
    id text NOT NULL,
    "troopId" text NOT NULL,
    "planId" text NOT NULL,
    status text NOT NULL,
    "stripeCustomerId" text NOT NULL,
    "stripeSubscriptionId" text,
    "currentPeriodEnd" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "cancelAtPeriodEnd" boolean DEFAULT false NOT NULL,
    "canceledAt" timestamp(3) without time zone,
    "trialStart" timestamp(3) without time zone,
    "trialEnd" timestamp(3) without time zone,
    "pausedAt" timestamp(3) without time zone,
    "isPaused" boolean DEFAULT false NOT NULL,
    "discountCode" text,
    "discountEnd" timestamp(3) without time zone
);


ALTER TABLE public."Subscription" OWNER TO neondb_owner;

--
-- Name: Transaction; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Transaction" (
    id text NOT NULL,
    "troopId" text NOT NULL,
    type public."TransactionType" NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text,
    "fromAccount" text,
    "toAccount" text,
    "scoutId" text,
    "userId" text,
    "campoutId" text,
    "approvedBy" text,
    status public."TransactionStatus" DEFAULT 'PENDING'::public."TransactionStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "budgetCategoryId" text,
    "fundraisingCampaignId" text
);


ALTER TABLE public."Transaction" OWNER TO neondb_owner;

--
-- Name: Troop; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Troop" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    council text,
    district text,
    settings jsonb,
    status public."TroopStatus" DEFAULT 'ACTIVE'::public."TroopStatus" NOT NULL,
    "deactivatedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Troop" OWNER TO neondb_owner;

--
-- Name: TroopMember; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."TroopMember" (
    id text NOT NULL,
    "troopId" text NOT NULL,
    "userId" text NOT NULL,
    role public."Role" DEFAULT 'SCOUT'::public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TroopMember" OWNER TO neondb_owner;

--
-- Name: TroopSettings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."TroopSettings" (
    id text NOT NULL,
    name text DEFAULT 'TroopTreasury'::text NOT NULL,
    council text,
    district text,
    address text,
    "rolePermissions" jsonb,
    "sessionTimeoutMinutes" integer DEFAULT 15 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TroopSettings" OWNER TO neondb_owner;

--
-- Name: User; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text,
    "passwordHash" text,
    role public."Role" DEFAULT 'SCOUT'::public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "deactivatedAt" timestamp(3) without time zone,
    "invitationToken" text,
    "invitationExpires" timestamp(3) without time zone,
    "failedLoginAttempts" integer DEFAULT 0 NOT NULL,
    "lockedUntil" timestamp(3) without time zone,
    "lastFailedLogin" timestamp(3) without time zone,
    "preferredTheme" text DEFAULT 'system'::text,
    "preferredColor" text DEFAULT 'orange'::text,
    "pushToken" text,
    "adminEmailAlerts" boolean DEFAULT true NOT NULL,
    "adminSmsAlerts" boolean DEFAULT false NOT NULL,
    "adminAlertTypes" jsonb
);


ALTER TABLE public."User" OWNER TO neondb_owner;

--
-- Name: WebhookEvent; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."WebhookEvent" (
    id text NOT NULL,
    "eventType" text NOT NULL,
    "stripeEventId" text NOT NULL,
    payload jsonb NOT NULL,
    processed boolean DEFAULT false NOT NULL,
    error text,
    "retryCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "processedAt" timestamp(3) without time zone
);


ALTER TABLE public."WebhookEvent" OWNER TO neondb_owner;

--
-- Data for Name: AdminAuditLog; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."AdminAuditLog" (id, "adminId", action, "targetId", details, "createdAt") FROM stdin;
\.


--
-- Data for Name: AdultExpense; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."AdultExpense" (id, "campoutId", "adultId", amount, description, category, "createdAt", "isReimbursed") FROM stdin;
\.


--
-- Data for Name: Budget; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Budget" (id, "troopId", year, status, "createdAt", "updatedAt", "annualDuesAmount") FROM stdin;
\.


--
-- Data for Name: BudgetCategory; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."BudgetCategory" (id, "budgetId", name, type, "plannedIncome", "plannedExpense") FROM stdin;
\.


--
-- Data for Name: CampaignProduct; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."CampaignProduct" (id, "campaignId", name, price, cost, "ibaAmount", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Campout; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Campout" (id, "troopId", name, "startDate", "endDate", location, "estimatedCost", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: CampoutAdult; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."CampoutAdult" ("campoutId", "adultId", role) FROM stdin;
\.


--
-- Data for Name: CampoutScout; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."CampoutScout" ("campoutId", "scoutId", "registeredAt") FROM stdin;
\.


--
-- Data for Name: DirectSalesGroup; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."DirectSalesGroup" (id, "campaignId", name, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DirectSalesGroupItem; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."DirectSalesGroupItem" (id, "groupId", "inventoryId", quantity, "soldCount", "amountCollected", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DirectSalesGroupVolunteer; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."DirectSalesGroupVolunteer" (id, "groupId", "scoutId", "userId", "createdAt") FROM stdin;
\.


--
-- Data for Name: DirectSalesInventory; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."DirectSalesInventory" (id, "campaignId", "productId", quantity, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FundraisingCampaign; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."FundraisingCampaign" (id, "troopId", name, "startDate", "endDate", goal, "isComplianceApproved", "ibaPercentage", status, type, description, "ticketPrice", "volunteerPercentage", "sendThankYou", "thankYouTemplate", "sendEventInvite") FROM stdin;
\.


--
-- Data for Name: FundraisingOrder; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."FundraisingOrder" (id, "campaignId", "scoutId", "productId", "customerName", "customerEmail", quantity, "amountPaid", delivered, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FundraisingSale; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."FundraisingSale" (id, "campaignId", "scoutId", quantity, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FundraisingVolunteer; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."FundraisingVolunteer" (id, "campaignId", "scoutId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Notification" (id, "userId", type, title, message, link, read, "createdAt") FROM stdin;
\.


--
-- Data for Name: ParentScout; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."ParentScout" ("parentId", "scoutId") FROM stdin;
\.


--
-- Data for Name: PendingRegistration; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."PendingRegistration" (id, email, name, "troopName", "troopSlug", council, district, "passwordHash", "expiresAt", "createdAt", "stripeSessionId") FROM stdin;
f871277b-6f91-4846-90e6-a8813f5079c1	admin@example.com	Admin User	Troop 79	t79-cc	Chester County	Horse Shoe	$2b$10$07nccqWNDLTa3rGVtviqk.tgBErFeYHONb6nYnVyRvxsiHtAG6vlC	2026-02-08 21:06:43.1	2026-02-07 21:06:43.103	\N
\.


--
-- Data for Name: Scout; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Scout" (id, "troopId", name, age, "ibaBalance", status, "createdAt", "updatedAt", "userId", email) FROM stdin;
\.


--
-- Data for Name: Subscription; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Subscription" (id, "troopId", "planId", status, "stripeCustomerId", "stripeSubscriptionId", "currentPeriodEnd", "createdAt", "updatedAt", "cancelAtPeriodEnd", "canceledAt", "trialStart", "trialEnd", "pausedAt", "isPaused", "discountCode", "discountEnd") FROM stdin;
\.


--
-- Data for Name: Transaction; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Transaction" (id, "troopId", type, amount, description, "fromAccount", "toAccount", "scoutId", "userId", "campoutId", "approvedBy", status, "createdAt", "updatedAt", "budgetCategoryId", "fundraisingCampaignId") FROM stdin;
\.


--
-- Data for Name: Troop; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Troop" (id, name, slug, council, district, settings, status, "deactivatedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TroopMember; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."TroopMember" (id, "troopId", "userId", role, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TroopSettings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."TroopSettings" (id, name, council, district, address, "rolePermissions", "sessionTimeoutMinutes", "updatedAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."User" (id, email, name, "passwordHash", role, "createdAt", "updatedAt", "isActive", "deactivatedAt", "invitationToken", "invitationExpires", "failedLoginAttempts", "lockedUntil", "lastFailedLogin", "preferredTheme", "preferredColor", "pushToken", "adminEmailAlerts", "adminSmsAlerts", "adminAlertTypes") FROM stdin;
a4f49e46-45a8-4a89-b1d8-d9eb7d0d8161	system@trooptreasury.com	System Administrator	$2b$10$DWfd/YP2AMkB67rdvh8sNejQzacJ2h69xenMVOwQ9to5QaKHYqH9e	PLATFORM_ADMIN	2026-02-07 21:02:06.65	2026-02-07 21:02:06.65	t	\N	\N	\N	0	\N	\N	system	orange	\N	t	f	\N
\.


--
-- Data for Name: WebhookEvent; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."WebhookEvent" (id, "eventType", "stripeEventId", payload, processed, error, "retryCount", "createdAt", "processedAt") FROM stdin;
\.


--
-- Name: AdminAuditLog AdminAuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AdminAuditLog"
    ADD CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY (id);


--
-- Name: AdultExpense AdultExpense_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AdultExpense"
    ADD CONSTRAINT "AdultExpense_pkey" PRIMARY KEY (id);


--
-- Name: BudgetCategory BudgetCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."BudgetCategory"
    ADD CONSTRAINT "BudgetCategory_pkey" PRIMARY KEY (id);


--
-- Name: Budget Budget_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Budget"
    ADD CONSTRAINT "Budget_pkey" PRIMARY KEY (id);


--
-- Name: CampaignProduct CampaignProduct_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."CampaignProduct"
    ADD CONSTRAINT "CampaignProduct_pkey" PRIMARY KEY (id);


--
-- Name: CampoutAdult CampoutAdult_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."CampoutAdult"
    ADD CONSTRAINT "CampoutAdult_pkey" PRIMARY KEY ("campoutId", "adultId", role);


--
-- Name: CampoutScout CampoutScout_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."CampoutScout"
    ADD CONSTRAINT "CampoutScout_pkey" PRIMARY KEY ("campoutId", "scoutId");


--
-- Name: Campout Campout_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Campout"
    ADD CONSTRAINT "Campout_pkey" PRIMARY KEY (id);


--
-- Name: DirectSalesGroupItem DirectSalesGroupItem_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DirectSalesGroupItem"
    ADD CONSTRAINT "DirectSalesGroupItem_pkey" PRIMARY KEY (id);


--
-- Name: DirectSalesGroupVolunteer DirectSalesGroupVolunteer_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DirectSalesGroupVolunteer"
    ADD CONSTRAINT "DirectSalesGroupVolunteer_pkey" PRIMARY KEY (id);


--
-- Name: DirectSalesGroup DirectSalesGroup_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DirectSalesGroup"
    ADD CONSTRAINT "DirectSalesGroup_pkey" PRIMARY KEY (id);


--
-- Name: DirectSalesInventory DirectSalesInventory_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DirectSalesInventory"
    ADD CONSTRAINT "DirectSalesInventory_pkey" PRIMARY KEY (id);


--
-- Name: FundraisingCampaign FundraisingCampaign_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FundraisingCampaign"
    ADD CONSTRAINT "FundraisingCampaign_pkey" PRIMARY KEY (id);


--
-- Name: FundraisingOrder FundraisingOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FundraisingOrder"
    ADD CONSTRAINT "FundraisingOrder_pkey" PRIMARY KEY (id);


--
-- Name: FundraisingSale FundraisingSale_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FundraisingSale"
    ADD CONSTRAINT "FundraisingSale_pkey" PRIMARY KEY (id);


--
-- Name: FundraisingVolunteer FundraisingVolunteer_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FundraisingVolunteer"
    ADD CONSTRAINT "FundraisingVolunteer_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: ParentScout ParentScout_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ParentScout"
    ADD CONSTRAINT "ParentScout_pkey" PRIMARY KEY ("parentId", "scoutId");


--
-- Name: PendingRegistration PendingRegistration_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."PendingRegistration"
    ADD CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY (id);


--
-- Name: Scout Scout_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Scout"
    ADD CONSTRAINT "Scout_pkey" PRIMARY KEY (id);


--
-- Name: Subscription Subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_pkey" PRIMARY KEY (id);


--
-- Name: Transaction Transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_pkey" PRIMARY KEY (id);


--
-- Name: TroopMember TroopMember_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TroopMember"
    ADD CONSTRAINT "TroopMember_pkey" PRIMARY KEY (id);


--
-- Name: TroopSettings TroopSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TroopSettings"
    ADD CONSTRAINT "TroopSettings_pkey" PRIMARY KEY (id);


--
-- Name: Troop Troop_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Troop"
    ADD CONSTRAINT "Troop_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: WebhookEvent WebhookEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."WebhookEvent"
    ADD CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY (id);


--
-- Name: CampaignProduct_campaignId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "CampaignProduct_campaignId_idx" ON public."CampaignProduct" USING btree ("campaignId");


--
-- Name: DirectSalesGroupItem_groupId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "DirectSalesGroupItem_groupId_idx" ON public."DirectSalesGroupItem" USING btree ("groupId");


--
-- Name: DirectSalesGroupItem_inventoryId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "DirectSalesGroupItem_inventoryId_idx" ON public."DirectSalesGroupItem" USING btree ("inventoryId");


--
-- Name: DirectSalesGroupVolunteer_groupId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "DirectSalesGroupVolunteer_groupId_idx" ON public."DirectSalesGroupVolunteer" USING btree ("groupId");


--
-- Name: DirectSalesGroupVolunteer_groupId_scoutId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "DirectSalesGroupVolunteer_groupId_scoutId_key" ON public."DirectSalesGroupVolunteer" USING btree ("groupId", "scoutId");


--
-- Name: DirectSalesGroupVolunteer_groupId_userId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "DirectSalesGroupVolunteer_groupId_userId_key" ON public."DirectSalesGroupVolunteer" USING btree ("groupId", "userId");


--
-- Name: DirectSalesGroup_campaignId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "DirectSalesGroup_campaignId_idx" ON public."DirectSalesGroup" USING btree ("campaignId");


--
-- Name: DirectSalesInventory_campaignId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "DirectSalesInventory_campaignId_idx" ON public."DirectSalesInventory" USING btree ("campaignId");


--
-- Name: FundraisingSale_campaignId_scoutId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "FundraisingSale_campaignId_scoutId_key" ON public."FundraisingSale" USING btree ("campaignId", "scoutId");


--
-- Name: FundraisingVolunteer_campaignId_scoutId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "FundraisingVolunteer_campaignId_scoutId_key" ON public."FundraisingVolunteer" USING btree ("campaignId", "scoutId");


--
-- Name: PendingRegistration_email_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "PendingRegistration_email_key" ON public."PendingRegistration" USING btree (email);


--
-- Name: PendingRegistration_stripeSessionId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "PendingRegistration_stripeSessionId_key" ON public."PendingRegistration" USING btree ("stripeSessionId");


--
-- Name: Scout_email_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Scout_email_key" ON public."Scout" USING btree (email);


--
-- Name: Scout_userId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Scout_userId_key" ON public."Scout" USING btree ("userId");


--
-- Name: Subscription_stripeCustomerId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON public."Subscription" USING btree ("stripeCustomerId");


--
-- Name: Subscription_stripeSubscriptionId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON public."Subscription" USING btree ("stripeSubscriptionId");


--
-- Name: Subscription_troopId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Subscription_troopId_key" ON public."Subscription" USING btree ("troopId");


--
-- Name: TroopMember_troopId_userId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "TroopMember_troopId_userId_key" ON public."TroopMember" USING btree ("troopId", "userId");


--
-- Name: Troop_slug_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Troop_slug_key" ON public."Troop" USING btree (slug);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_invitationToken_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "User_invitationToken_key" ON public."User" USING btree ("invitationToken");


--
-- Name: WebhookEvent_stripeEventId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "WebhookEvent_stripeEventId_key" ON public."WebhookEvent" USING btree ("stripeEventId");


--
-- Name: AdminAuditLog AdminAuditLog_adminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AdminAuditLog"
    ADD CONSTRAINT "AdminAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AdultExpense AdultExpense_adultId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AdultExpense"
    ADD CONSTRAINT "AdultExpense_adultId_fkey" FOREIGN KEY ("adultId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AdultExpense AdultExpense_campoutId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AdultExpense"
    ADD CONSTRAINT "AdultExpense_campoutId_fkey" FOREIGN KEY ("campoutId") REFERENCES public."Campout"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BudgetCategory BudgetCategory_budgetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."BudgetCategory"
    ADD CONSTRAINT "BudgetCategory_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES public."Budget"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Budget Budget_troopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Budget"
    ADD CONSTRAINT "Budget_troopId_fkey" FOREIGN KEY ("troopId") REFERENCES public."Troop"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CampaignProduct CampaignProduct_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."CampaignProduct"
    ADD CONSTRAINT "CampaignProduct_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."FundraisingCampaign"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CampoutAdult CampoutAdult_adultId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."CampoutAdult"
    ADD CONSTRAINT "CampoutAdult_adultId_fkey" FOREIGN KEY ("adultId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CampoutAdult CampoutAdult_campoutId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."CampoutAdult"
    ADD CONSTRAINT "CampoutAdult_campoutId_fkey" FOREIGN KEY ("campoutId") REFERENCES public."Campout"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CampoutScout CampoutScout_campoutId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."CampoutScout"
    ADD CONSTRAINT "CampoutScout_campoutId_fkey" FOREIGN KEY ("campoutId") REFERENCES public."Campout"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CampoutScout CampoutScout_scoutId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."CampoutScout"
    ADD CONSTRAINT "CampoutScout_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES public."Scout"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Campout Campout_troopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Campout"
    ADD CONSTRAINT "Campout_troopId_fkey" FOREIGN KEY ("troopId") REFERENCES public."Troop"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DirectSalesGroupItem DirectSalesGroupItem_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DirectSalesGroupItem"
    ADD CONSTRAINT "DirectSalesGroupItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."DirectSalesGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DirectSalesGroupItem DirectSalesGroupItem_inventoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DirectSalesGroupItem"
    ADD CONSTRAINT "DirectSalesGroupItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES public."DirectSalesInventory"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DirectSalesGroupVolunteer DirectSalesGroupVolunteer_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DirectSalesGroupVolunteer"
    ADD CONSTRAINT "DirectSalesGroupVolunteer_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."DirectSalesGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DirectSalesGroupVolunteer DirectSalesGroupVolunteer_scoutId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DirectSalesGroupVolunteer"
    ADD CONSTRAINT "DirectSalesGroupVolunteer_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES public."Scout"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DirectSalesGroupVolunteer DirectSalesGroupVolunteer_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DirectSalesGroupVolunteer"
    ADD CONSTRAINT "DirectSalesGroupVolunteer_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DirectSalesGroup DirectSalesGroup_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DirectSalesGroup"
    ADD CONSTRAINT "DirectSalesGroup_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."FundraisingCampaign"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DirectSalesInventory DirectSalesInventory_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DirectSalesInventory"
    ADD CONSTRAINT "DirectSalesInventory_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."FundraisingCampaign"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DirectSalesInventory DirectSalesInventory_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DirectSalesInventory"
    ADD CONSTRAINT "DirectSalesInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."CampaignProduct"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FundraisingCampaign FundraisingCampaign_troopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FundraisingCampaign"
    ADD CONSTRAINT "FundraisingCampaign_troopId_fkey" FOREIGN KEY ("troopId") REFERENCES public."Troop"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FundraisingOrder FundraisingOrder_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FundraisingOrder"
    ADD CONSTRAINT "FundraisingOrder_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."FundraisingCampaign"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FundraisingOrder FundraisingOrder_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FundraisingOrder"
    ADD CONSTRAINT "FundraisingOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."CampaignProduct"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FundraisingOrder FundraisingOrder_scoutId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FundraisingOrder"
    ADD CONSTRAINT "FundraisingOrder_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES public."Scout"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FundraisingSale FundraisingSale_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FundraisingSale"
    ADD CONSTRAINT "FundraisingSale_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."FundraisingCampaign"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FundraisingSale FundraisingSale_scoutId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FundraisingSale"
    ADD CONSTRAINT "FundraisingSale_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES public."Scout"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FundraisingVolunteer FundraisingVolunteer_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FundraisingVolunteer"
    ADD CONSTRAINT "FundraisingVolunteer_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."FundraisingCampaign"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FundraisingVolunteer FundraisingVolunteer_scoutId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FundraisingVolunteer"
    ADD CONSTRAINT "FundraisingVolunteer_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES public."Scout"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ParentScout ParentScout_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ParentScout"
    ADD CONSTRAINT "ParentScout_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ParentScout ParentScout_scoutId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ParentScout"
    ADD CONSTRAINT "ParentScout_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES public."Scout"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Scout Scout_troopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Scout"
    ADD CONSTRAINT "Scout_troopId_fkey" FOREIGN KEY ("troopId") REFERENCES public."Troop"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Scout Scout_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Scout"
    ADD CONSTRAINT "Scout_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Subscription Subscription_troopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_troopId_fkey" FOREIGN KEY ("troopId") REFERENCES public."Troop"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Transaction Transaction_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Transaction Transaction_budgetCategoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_budgetCategoryId_fkey" FOREIGN KEY ("budgetCategoryId") REFERENCES public."BudgetCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Transaction Transaction_campoutId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_campoutId_fkey" FOREIGN KEY ("campoutId") REFERENCES public."Campout"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Transaction Transaction_fundraisingCampaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_fundraisingCampaignId_fkey" FOREIGN KEY ("fundraisingCampaignId") REFERENCES public."FundraisingCampaign"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Transaction Transaction_scoutId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES public."Scout"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Transaction Transaction_troopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_troopId_fkey" FOREIGN KEY ("troopId") REFERENCES public."Troop"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Transaction Transaction_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TroopMember TroopMember_troopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TroopMember"
    ADD CONSTRAINT "TroopMember_troopId_fkey" FOREIGN KEY ("troopId") REFERENCES public."Troop"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TroopMember TroopMember_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TroopMember"
    ADD CONSTRAINT "TroopMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: neondb_owner
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict 3b67B9U1lhsRhO5zmYqJZHHduemIitr3opBhCxSrM5JvebqavTziEaLf1peTU4s

