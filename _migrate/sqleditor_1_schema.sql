--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
-- (ข้ามการสร้าง — Supabase มี schema public ให้อยู่แล้วทุกโปรเจกต์)
--


--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: analytics_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."analytics_cache" (
    "cache_key" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: app_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."app_config" (
    "key" "text" NOT NULL,
    "value" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."audit_log" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_email" "text" DEFAULT ''::"text" NOT NULL,
    "module" "text" DEFAULT ''::"text" NOT NULL,
    "action" "text" DEFAULT ''::"text" NOT NULL,
    "detail" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'success'::"text" NOT NULL
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."audit_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."audit_log_id_seq" OWNED BY "public"."audit_log"."id";


--
-- Name: block_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."block_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "domain" "text" NOT NULL,
    "label" "text" DEFAULT ''::"text",
    "start_day" smallint,
    "end_day" smallint,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "start_date" "date",
    "end_date" "date"
);


--
-- Name: counting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."counting" (
    "id" bigint NOT NULL,
    "count_date" "date",
    "item_number" "text",
    "product_name" "text",
    "site" "text",
    "warehouse" "text",
    "batch_number" "text",
    "serial_number" "text",
    "cw_onhand" numeric DEFAULT 0,
    "cw_counted" numeric DEFAULT 0,
    "cw_quantity" numeric DEFAULT 0,
    "cw_unit" "text",
    "onhand" numeric DEFAULT 0,
    "counted" numeric DEFAULT 0,
    "quantity" numeric DEFAULT 0,
    "batch_number2" "text",
    "unit" "text",
    "batch_disposition_code" "text",
    "batch_disposition_status" "text",
    "worker" "text",
    "imported_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: counting_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."counting_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: counting_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."counting_id_seq" OWNED BY "public"."counting"."id";


--
-- Name: damage_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."damage_requests" (
    "id" bigint NOT NULL,
    "request_date" "date" NOT NULL,
    "warehouse" "text",
    "item_sku" "text",
    "item_name" "text",
    "quantity" numeric,
    "unit" "text",
    "damage_type" "text",
    "damage_desc" "text",
    "returned_from" "text",
    "action_requested" "text",
    "recipient_email" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: damage_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."damage_requests_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: damage_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."damage_requests_id_seq" OWNED BY "public"."damage_requests"."id";


--
-- Name: delivery_confirmations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."delivery_confirmations" (
    "id" bigint NOT NULL,
    "plan_id" "text" NOT NULL,
    "shop_id" "text" DEFAULT ''::"text" NOT NULL,
    "shop_name" "text" DEFAULT ''::"text" NOT NULL,
    "shop_seq" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "driver_username" "text" DEFAULT ''::"text" NOT NULL,
    "confirmed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: delivery_confirmations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."delivery_confirmations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: delivery_confirmations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."delivery_confirmations_id_seq" OWNED BY "public"."delivery_confirmations"."id";


--
-- Name: delivery_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."delivery_items" (
    "id" bigint NOT NULL,
    "plan_id" "text",
    "sku" "text",
    "sku_name" "text",
    "pcs" integer,
    "delivery_date" "date",
    "status" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: delivery_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."delivery_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: delivery_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."delivery_items_id_seq" OWNED BY "public"."delivery_items"."id";


--
-- Name: driver_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."driver_activity_log" (
    "id" bigint NOT NULL,
    "delivery_date" "date",
    "driver_name" "text",
    "truck_plate" "text",
    "mileage_start" numeric,
    "mileage_end" numeric,
    "time_depart" "text",
    "time_arrive" "text",
    "shop_code" "text",
    "shop_name" "text",
    "distance_km" numeric,
    "travel_minutes" numeric,
    "km_per_hr" numeric,
    "planned_distance" numeric,
    "sale" "text",
    "recorded_at" "text"
);


--
-- Name: driver_activity_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."driver_activity_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: driver_activity_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."driver_activity_log_id_seq" OWNED BY "public"."driver_activity_log"."id";


--
-- Name: driver_incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."driver_incidents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "driver_id" "text",
    "driver_username" "text",
    "incident_date" "date" NOT NULL,
    "incident_type" "text" NOT NULL,
    "amount" numeric DEFAULT 0,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "driver_incidents_incident_type_check" CHECK (("incident_type" = ANY (ARRAY['ticket'::"text", 'accident'::"text"])))
);


--
-- Name: driver_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."driver_users" (
    "id" integer NOT NULL,
    "username" "text" NOT NULL,
    "password" "text" NOT NULL,
    "driver_name" "text" DEFAULT ''::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "driver_id" "text" DEFAULT ''::"text" NOT NULL,
    "bypass_timer" boolean DEFAULT false,
    "is_supervisor" boolean DEFAULT false
);


--
-- Name: driver_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."driver_users_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: driver_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."driver_users_id_seq" OWNED BY "public"."driver_users"."id";


--
-- Name: driver_work_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."driver_work_logs" (
    "id" bigint NOT NULL,
    "driver_username" "text" NOT NULL,
    "plan_id" "text" DEFAULT ''::"text" NOT NULL,
    "work_date" "date" NOT NULL,
    "odometer_start" numeric DEFAULT 0 NOT NULL,
    "odometer_end" numeric DEFAULT 0 NOT NULL,
    "time_depart" "text" DEFAULT ''::"text" NOT NULL,
    "time_arrive" "text" DEFAULT ''::"text" NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: driver_work_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."driver_work_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: driver_work_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."driver_work_logs_id_seq" OWNED BY "public"."driver_work_logs"."id";


--
-- Name: gps_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."gps_activity_log" (
    "id" bigint NOT NULL,
    "device_id" "text" DEFAULT ''::"text" NOT NULL,
    "truck" "text" DEFAULT ''::"text" NOT NULL,
    "vehicle_name" "text" DEFAULT ''::"text" NOT NULL,
    "driver" "text" DEFAULT ''::"text" NOT NULL,
    "activity_date" "date" NOT NULL,
    "time_start" "text" DEFAULT ''::"text" NOT NULL,
    "time_end" "text" DEFAULT ''::"text" NOT NULL,
    "engine_run_time" "text" DEFAULT ''::"text" NOT NULL,
    "idle_str" "text" DEFAULT ''::"text" NOT NULL,
    "travel_time" "text" DEFAULT ''::"text" NOT NULL,
    "distance" numeric DEFAULT 0 NOT NULL,
    "avg_speed" numeric DEFAULT 0 NOT NULL,
    "max_speed" numeric DEFAULT 0 NOT NULL,
    "fuel_used" numeric DEFAULT 0 NOT NULL,
    "idle_min" numeric DEFAULT 0 NOT NULL,
    "engine_min" numeric DEFAULT 0 NOT NULL,
    "fuel_eff" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: gps_activity_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."gps_activity_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gps_activity_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."gps_activity_log_id_seq" OWNED BY "public"."gps_activity_log"."id";


--
-- Name: holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."holidays" (
    "holiday_date" "date" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: inventory_daily_snapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."inventory_daily_snapshot" (
    "snapshot_date" "date" NOT NULL,
    "total_kg" numeric DEFAULT 0,
    "total_lines" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "total_sku" integer DEFAULT 0
);


--
-- Name: kpi_inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."kpi_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cycle_date" "date" NOT NULL,
    "type" "text" NOT NULL,
    "total_sku" integer,
    "total_lines" integer,
    "prd_total_sku" integer,
    "prd_total_lines" integer,
    "checker_error_sku" integer,
    "checker_error_lines" integer,
    "prd_error_sku" integer,
    "prd_error_lines" integer,
    "diff_sku" integer,
    "diff_lines" integer,
    "kpi_checker" numeric,
    "kpi_prd" numeric,
    "recorded_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "employee_id" "text",
    "kpi_final" numeric,
    "weight_sku" numeric DEFAULT 40,
    "weight_pcs" numeric DEFAULT 60,
    "checker_sku_pct" numeric,
    "checker_pcs_pct" numeric,
    "prd_sku_pct" numeric,
    "prd_pcs_pct" numeric,
    CONSTRAINT "kpi_inventory_type_check" CHECK (("type" = ANY (ARRAY['FG'::"text", 'SEMI'::"text"])))
);


--
-- Name: kpi_wh_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."kpi_wh_log" (
    "id" bigint NOT NULL,
    "cycle_date" "date" NOT NULL,
    "checker_fg" numeric,
    "checker_semi" numeric,
    "final_adj_fg" numeric,
    "final_adj_semi" numeric,
    "space_breakdown" numeric,
    "load_score" numeric,
    "damage_score" numeric,
    "data_err_fg" numeric,
    "data_err_semi" numeric,
    "recorded_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "plan_minutes" numeric
);


--
-- Name: kpi_wh_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."kpi_wh_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kpi_wh_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."kpi_wh_log_id_seq" OWNED BY "public"."kpi_wh_log"."id";


--
-- Name: loading_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."loading_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_id" "text",
    "order_date" "date" NOT NULL,
    "truck_plate" "text",
    "items" "jsonb" DEFAULT '[]'::"jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "note" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "order_no" "text",
    "customer_name" "text",
    "is_trailer" boolean DEFAULT false,
    "trailer_plate" "text",
    "trailer_split" "jsonb",
    "scale_diff" double precision,
    "review_status" "text",
    "rejection_reason_type" integer,
    "rejection_note" "text",
    "reviewed_by" "text",
    "reviewed_at" timestamp with time zone,
    "loop_weigh" boolean DEFAULT false,
    "unit_review" "jsonb" DEFAULT '{}'::"jsonb"
);


--
-- Name: loading_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."loading_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "plan_id" "text",
    "plan_date" "date",
    "record_type" "text" DEFAULT 'บันทึกการโหลด'::"text",
    "staff_id" "text",
    "staff_name" "text",
    "team" "text",
    "sku" "text",
    "product_name" "text",
    "qty" numeric DEFAULT 0,
    "weight" numeric DEFAULT 0,
    "lift_count" integer DEFAULT 0,
    "lifts" "jsonb" DEFAULT '[]'::"jsonb",
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "note" "text",
    "photo_urls" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "truck_unit" "text" DEFAULT 'mother'::"text",
    "work_time_min" integer DEFAULT 0,
    "pause_count" integer DEFAULT 0,
    "round_no" integer DEFAULT 1
);


--
-- Name: COLUMN "loading_sessions"."work_time_min"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."loading_sessions"."work_time_min" IS 'Actual loading work time in minutes (excludes pauses, accumulates across rejection rounds)';


--
-- Name: COLUMN "loading_sessions"."pause_count"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."loading_sessions"."pause_count" IS 'Number of pause/break segments during loading';


--
-- Name: COLUMN "loading_sessions"."round_no"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."loading_sessions"."round_no" IS '1 = first load attempt, 2 = after 1st rejection, etc.';


--
-- Name: logi_drivers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."logi_drivers" (
    "id" "text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "can_trailer" boolean DEFAULT false NOT NULL,
    "trailer_priority" integer DEFAULT 1 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: logi_shops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."logi_shops" (
    "id" "text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "address" "text" DEFAULT ''::"text" NOT NULL,
    "phone" "text" DEFAULT ''::"text" NOT NULL,
    "sale" "text" DEFAULT ''::"text" NOT NULL,
    "distance" numeric DEFAULT 0 NOT NULL,
    "no_trailer" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: logi_transports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."logi_transports" (
    "id" "text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "capacity" numeric DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: logi_trucks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."logi_trucks" (
    "plate" "text" NOT NULL,
    "type" "text" DEFAULT ''::"text" NOT NULL,
    "net_weight" numeric DEFAULT 0 NOT NULL,
    "cap_mother" numeric DEFAULT 0 NOT NULL,
    "cap_child" numeric DEFAULT 0 NOT NULL,
    "child_plate" "text" DEFAULT ''::"text" NOT NULL,
    "is_trailer" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: logi_wh_staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."logi_wh_staff" (
    "id" "text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "team" "text" DEFAULT ''::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "username" "text" DEFAULT ''::"text" NOT NULL,
    "password" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text",
    "emp_code" "text"
);


--
-- Name: logistic_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."logistic_plans" (
    "plan_id" "text" NOT NULL,
    "plan_date" "date" NOT NULL,
    "job_type" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'planned'::"text" NOT NULL,
    "truck_type" "text" DEFAULT 'company'::"text" NOT NULL,
    "truck_plate" "text" DEFAULT ''::"text" NOT NULL,
    "child_plate" "text" DEFAULT ''::"text" NOT NULL,
    "driver_transport" "text" DEFAULT ''::"text" NOT NULL,
    "driver_id" "text" DEFAULT ''::"text" NOT NULL,
    "trip_no" "text" DEFAULT ''::"text" NOT NULL,
    "trailer_mode" "text" DEFAULT ''::"text" NOT NULL,
    "wage" numeric DEFAULT 0 NOT NULL,
    "warehouse" "text" DEFAULT ''::"text" NOT NULL,
    "fail_reason" "text" DEFAULT ''::"text" NOT NULL,
    "shops" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "total_weight" numeric DEFAULT 0 NOT NULL,
    "return_distance" numeric DEFAULT 0 NOT NULL,
    "is_mother" boolean DEFAULT false NOT NULL,
    "is_child" boolean DEFAULT false NOT NULL,
    "pair_id" "text" DEFAULT ''::"text" NOT NULL,
    "created_by" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: move_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."move_log" (
    "id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "move_date" "date",
    "from_zone" "text" DEFAULT ''::"text" NOT NULL,
    "to_zone" "text" DEFAULT ''::"text" NOT NULL,
    "sku" "text" DEFAULT ''::"text" NOT NULL,
    "sku_name" "text" DEFAULT ''::"text" NOT NULL,
    "bundles" integer DEFAULT 0 NOT NULL,
    "ppb" integer DEFAULT 1 NOT NULL,
    "pcs" integer DEFAULT 0 NOT NULL,
    "recorded_by" "text" DEFAULT ''::"text" NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL
);


--
-- Name: onhand; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."onhand" (
    "sku" "text" NOT NULL,
    "warehouse" "text" NOT NULL,
    "qty" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: onhand_fg; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."onhand_fg" (
    "item_number" "text" NOT NULL,
    "product_name" "text" DEFAULT ''::"text" NOT NULL,
    "cw_ordered" numeric DEFAULT 0,
    "cw_physical_inventory" numeric DEFAULT 0,
    "cw_on_order" numeric DEFAULT 0,
    "cw_physical_reserved" numeric DEFAULT 0,
    "cw_available_physical" numeric DEFAULT 0,
    "cw_total_available" numeric DEFAULT 0,
    "ordered" numeric DEFAULT 0,
    "physical_inventory" numeric DEFAULT 0,
    "on_order" numeric DEFAULT 0,
    "physical_reserved" numeric DEFAULT 0,
    "warehouse" "text" DEFAULT ''::"text" NOT NULL,
    "available_physical" numeric DEFAULT 0,
    "total_available" numeric DEFAULT 0,
    "imported_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: onhand_rm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."onhand_rm" (
    "id" bigint NOT NULL,
    "item_number" "text",
    "product_name" "text",
    "batch_number" "text",
    "serial_number" "text",
    "physical_inventory" numeric DEFAULT 0,
    "available_physical" numeric DEFAULT 0,
    "total_available" numeric DEFAULT 0,
    "product_identification" "text",
    "search_name" "text",
    "warehouse" "text",
    "imported_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


--
-- Name: onhand_rm_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."onhand_rm_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: onhand_rm_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."onhand_rm_id_seq" OWNED BY "public"."onhand_rm"."id";


--
-- Name: onhand_semi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."onhand_semi" (
    "item_number" "text" NOT NULL,
    "product_name" "text" DEFAULT ''::"text" NOT NULL,
    "cw_ordered" numeric DEFAULT 0,
    "cw_physical_inventory" numeric DEFAULT 0,
    "cw_on_order" numeric DEFAULT 0,
    "cw_physical_reserved" numeric DEFAULT 0,
    "cw_available_physical" numeric DEFAULT 0,
    "cw_total_available" numeric DEFAULT 0,
    "ordered" numeric DEFAULT 0,
    "physical_inventory" numeric DEFAULT 0,
    "on_order" numeric DEFAULT 0,
    "physical_reserved" numeric DEFAULT 0,
    "warehouse" "text" DEFAULT ''::"text" NOT NULL,
    "available_physical" numeric DEFAULT 0,
    "total_available" numeric DEFAULT 0,
    "imported_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "batch_number" "text",
    "serial_number" "text" NOT NULL
);


--
-- Name: semi_fg_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."semi_fg_mapping" (
    "id" bigint NOT NULL,
    "semi_item" "text" NOT NULL,
    "semi_name" "text" DEFAULT ''::"text",
    "fg_code_1" "text" DEFAULT ''::"text",
    "fg_name_1" "text" DEFAULT ''::"text",
    "fg_code_2" "text" DEFAULT ''::"text",
    "fg_name_2" "text" DEFAULT ''::"text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: onhand_semi_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."onhand_semi_full" AS
 SELECT "s"."item_number",
    "s"."product_name",
    "s"."warehouse",
    "s"."batch_number",
    "s"."serial_number",
    "s"."physical_inventory",
    "s"."available_physical",
    "s"."total_available",
    "s"."imported_at",
    "m"."fg_code_1",
    "m"."fg_name_1",
    "m"."fg_code_2",
    "m"."fg_name_2"
   FROM ("public"."onhand_semi" "s"
     LEFT JOIN "public"."semi_fg_mapping" "m" ON (("m"."semi_item" = "s"."item_number")));


--
-- Name: print_tag_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."print_tag_log" (
    "id" bigint NOT NULL,
    "printed_at" timestamp with time zone NOT NULL,
    "print_date" "date" NOT NULL,
    "sku" "text" NOT NULL,
    "bundles" integer DEFAULT 0 NOT NULL,
    "user_email" "text",
    "total_pcs" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: print_tag_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."print_tag_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: print_tag_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."print_tag_log_id_seq" OWNED BY "public"."print_tag_log"."id";


--
-- Name: production_block; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."production_block" (
    "id" bigint NOT NULL,
    "block_date" "date" NOT NULL,
    "machine" "text" DEFAULT ''::"text" NOT NULL,
    "sku" "text" DEFAULT ''::"text" NOT NULL,
    "bundles" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: production_block_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."production_block_cache" (
    "month_key" "text" NOT NULL,
    "data" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: production_block_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."production_block_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_block_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."production_block_id_seq" OWNED BY "public"."production_block"."id";


--
-- Name: production_plan_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."production_plan_cache" (
    "month_key" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."products" (
    "sku" "text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "lines_per_bundle" integer DEFAULT 1 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "bundle_width" numeric DEFAULT 0,
    "bundle_height" numeric DEFAULT 0,
    "likely_w" numeric DEFAULT 0,
    "min_w" numeric DEFAULT 0,
    "max_w" numeric DEFAULT 0,
    "lifts_per_round" integer DEFAULT 0,
    "search_name" "text",
    "production_pool" "text",
    "item_group" "text",
    "status" "text",
    "semi_code" "text",
    "semi_code2" "text"
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "username" "text" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: semi_fg_mapping_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."semi_fg_mapping_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: semi_fg_mapping_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."semi_fg_mapping_id_seq" OWNED BY "public"."semi_fg_mapping"."id";


--
-- Name: sheet_plan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."sheet_plan" (
    "id" bigint NOT NULL,
    "plan_date" "date" NOT NULL,
    "machine" "text" DEFAULT ''::"text" NOT NULL,
    "sku" "text" DEFAULT ''::"text" NOT NULL,
    "bundles" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: sheet_plan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."sheet_plan_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sheet_plan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."sheet_plan_id_seq" OWNED BY "public"."sheet_plan"."id";


--
-- Name: shop_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."shop_visits" (
    "id" bigint NOT NULL,
    "plan_id" "text" NOT NULL,
    "shop_seq" integer NOT NULL,
    "shop_name" "text" DEFAULT ''::"text" NOT NULL,
    "mileage_arrival" integer,
    "lat_arrival" numeric,
    "lng_arrival" numeric,
    "acc_arrival" integer,
    "arrived_at" timestamp with time zone,
    "departed_at" timestamp with time zone,
    "photo_url" "text",
    "lat_depart" numeric,
    "lng_depart" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: shop_visits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."shop_visits_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shop_visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."shop_visits_id_seq" OWNED BY "public"."shop_visits"."id";


--
-- Name: stock_count_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."stock_count_items" (
    "id" bigint NOT NULL,
    "session_id" bigint,
    "sku" "text" NOT NULL,
    "sku_name" "text",
    "ppb" numeric DEFAULT 0,
    "bundle1" numeric DEFAULT 0,
    "bundle2" numeric DEFAULT 0,
    "scrap1" numeric DEFAULT 0,
    "scrap2" numeric DEFAULT 0,
    "system_pcs" numeric DEFAULT 0,
    "note" "text",
    "hold_pcs" integer DEFAULT 0,
    "system_pcs_qc" integer DEFAULT 0,
    "wh" "text"
);


--
-- Name: stock_count_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."stock_count_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_count_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."stock_count_items_id_seq" OWNED BY "public"."stock_count_items"."id";


--
-- Name: stock_count_semi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."stock_count_semi" (
    "id" bigint NOT NULL,
    "count_date" "date" NOT NULL,
    "semi_item" "text" NOT NULL,
    "semi_name" "text",
    "fg_code_1" "text",
    "fg_name_1" "text",
    "count1" integer DEFAULT 0,
    "fg_code_2" "text",
    "fg_name_2" "text",
    "count2" integer DEFAULT 0,
    "total_count" integer DEFAULT 0,
    "system_qty" integer DEFAULT 0,
    "diff" integer DEFAULT 0,
    "note" "text"
);


--
-- Name: stock_count_semi_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."stock_count_semi_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_count_semi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."stock_count_semi_id_seq" OWNED BY "public"."stock_count_semi"."id";


--
-- Name: stock_count_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."stock_count_sessions" (
    "id" bigint NOT NULL,
    "count_date" "date" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "movement_date" "date",
    "checker_name" "text",
    "wh" "text"
);


--
-- Name: stock_count_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."stock_count_sessions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_count_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."stock_count_sessions_id_seq" OWNED BY "public"."stock_count_sessions"."id";


--
-- Name: training_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."training_participants" (
    "id" bigint NOT NULL,
    "session_id" bigint,
    "driver_username" "text" NOT NULL,
    "driver_name" "text" NOT NULL,
    "acknowledged" boolean DEFAULT false,
    "photo_url" "text",
    "acknowledged_at" timestamp with time zone
);


--
-- Name: training_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."training_participants_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: training_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."training_participants_id_seq" OWNED BY "public"."training_participants"."id";


--
-- Name: training_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."training_sessions" (
    "id" bigint NOT NULL,
    "topic" "text" NOT NULL,
    "train_date" "date" NOT NULL,
    "trainer" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: training_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."training_sessions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: training_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."training_sessions_id_seq" OWNED BY "public"."training_sessions"."id";


--
-- Name: transection_fg; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."transection_fg" (
    "id" bigint NOT NULL,
    "modified_datetime" "text",
    "physical_date" "date",
    "production_pool" "text",
    "warehouse" "text",
    "item_number" "text",
    "product_name" "text",
    "reference" "text",
    "cw_quantity" numeric,
    "cw_unit" "text",
    "quantity" numeric,
    "unit" "text",
    "receipt" numeric DEFAULT 0,
    "issue" numeric DEFAULT 0,
    "number" "text",
    "customer_name" "text",
    "serial_number" "text",
    "serial_description" "text",
    "cost_amount" numeric,
    "site" "text",
    "tst_pd_date" "date",
    "min_w" numeric,
    "likely_w" numeric,
    "max_w" numeric,
    "produced_w" numeric,
    "w_range" "text",
    "imported_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: transection_fg_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."transection_fg_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transection_fg_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."transection_fg_id_seq" OWNED BY "public"."transection_fg"."id";


--
-- Name: transection_semi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."transection_semi" (
    "id" bigint NOT NULL,
    "imported_at" timestamp with time zone,
    "tst_pd_date" "date",
    "physical_date" "date",
    "modified_datetime" "text",
    "production_pool" "text",
    "warehouse" "text",
    "serial_number" "text",
    "batch_number" "text",
    "item_number" "text",
    "product_name" "text",
    "issue" "text",
    "quantity" numeric,
    "unit" "text",
    "number" "text",
    "reference" "text",
    "site" "text",
    "receipt" "text"
);


--
-- Name: transection_semi_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."transection_semi_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transection_semi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."transection_semi_id_seq" OWNED BY "public"."transection_semi"."id";


--
-- Name: trip_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."trip_logs" (
    "plan_id" "text" NOT NULL,
    "driver_username" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'idle'::"text" NOT NULL,
    "current_shop_seq" integer DEFAULT 0 NOT NULL,
    "mileage_start" integer,
    "mileage_end" integer,
    "lat_start" numeric,
    "lng_start" numeric,
    "acc_start" integer,
    "lat_end" numeric,
    "lng_end" numeric,
    "acc_end" integer,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "repair_cost" numeric DEFAULT 0
);


--
-- Name: truck_inspections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."truck_inspections" (
    "id" bigint NOT NULL,
    "inspect_date" "date" NOT NULL,
    "truck_plate" "text" NOT NULL,
    "driver_id" "text",
    "driver_name" "text",
    "items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "overall" "text" DEFAULT 'ok'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "inspect_type" "text" DEFAULT 'standard'::"text",
    "approval_status" "text" DEFAULT 'pending'::"text",
    "approved_by" "text",
    "approval_note" "text",
    "approved_at" timestamp with time zone
);


--
-- Name: truck_inspections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."truck_inspections_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: truck_inspections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."truck_inspections_id_seq" OWNED BY "public"."truck_inspections"."id";


--
-- Name: wh_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wh_activity_log" (
    "id" bigint NOT NULL,
    "type" "text" DEFAULT ''::"text" NOT NULL,
    "date" "date" NOT NULL,
    "emp_id" "text" DEFAULT ''::"text" NOT NULL,
    "emp_name" "text" DEFAULT ''::"text" NOT NULL,
    "team" "text" DEFAULT ''::"text" NOT NULL,
    "time_start" "text" DEFAULT ''::"text" NOT NULL,
    "time_end" "text" DEFAULT ''::"text" NOT NULL,
    "mins" numeric DEFAULT 0,
    "qty" numeric DEFAULT 0,
    "weight" numeric DEFAULT 0,
    "min_per_item" numeric DEFAULT 0,
    "weight_per_unit" numeric DEFAULT 0,
    "sku_a" "text" DEFAULT ''::"text" NOT NULL,
    "name_a" "text" DEFAULT ''::"text" NOT NULL,
    "damage_qty" numeric DEFAULT 0,
    "cause_p" "text" DEFAULT ''::"text" NOT NULL,
    "remark_q" "text" DEFAULT ''::"text" NOT NULL,
    "sku_b" "text" DEFAULT ''::"text" NOT NULL,
    "name_b" "text" DEFAULT ''::"text" NOT NULL,
    "truck_plate" "text" DEFAULT ''::"text" NOT NULL,
    "saved_at" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "order_id" "uuid"
);


--
-- Name: wh_activity_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."wh_activity_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wh_activity_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."wh_activity_log_id_seq" OWNED BY "public"."wh_activity_log"."id";


--
-- Name: wh_eval_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wh_eval_skills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "apply_role" "text" DEFAULT 'both'::"text" NOT NULL,
    "weight" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: wh_evaluations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wh_evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_id" "text",
    "staff_name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "eval_month" "text" NOT NULL,
    "salary_current" integer,
    "skills_done" "jsonb" DEFAULT '[]'::"jsonb",
    "score" integer DEFAULT 0,
    "salary_status" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: wms_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."wms_users" (
    "username" "text" NOT NULL,
    "password" "text" DEFAULT ''::"text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "role" "text" DEFAULT ''::"text" NOT NULL,
    "is_admin" boolean DEFAULT false NOT NULL,
    "perms" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "bypass_timer" boolean DEFAULT false
);


--
-- Name: work_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."work_orders" (
    "id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "text" DEFAULT ''::"text" NOT NULL,
    "zone" "text" DEFAULT ''::"text" NOT NULL,
    "sku" "text" DEFAULT ''::"text" NOT NULL,
    "sku_name" "text" DEFAULT ''::"text" NOT NULL,
    "bundles" integer DEFAULT 0 NOT NULL,
    "to_zone" "text" DEFAULT ''::"text" NOT NULL,
    "reason" "text" DEFAULT ''::"text" NOT NULL,
    "due_date" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'รอดำเนินการ'::"text" NOT NULL,
    "assigned_to" "text" DEFAULT ''::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL
);


--
-- Name: zone_capacity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."zone_capacity_log" (
    "id" bigint NOT NULL,
    "log_date" "date" NOT NULL,
    "zone" "text" NOT NULL,
    "empty_slots" integer DEFAULT 0 NOT NULL,
    "recorded_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: zone_capacity_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."zone_capacity_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: zone_capacity_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."zone_capacity_log_id_seq" OWNED BY "public"."zone_capacity_log"."id";


--
-- Name: zone_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."zone_configs" (
    "key" "text" NOT NULL,
    "value" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: zone_stock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."zone_stock" (
    "zone" "text" NOT NULL,
    "sku" "text" NOT NULL,
    "sku_name" "text" DEFAULT ''::"text" NOT NULL,
    "pcs" integer DEFAULT 0 NOT NULL,
    "ppb" integer DEFAULT 1 NOT NULL,
    "bundle_width" numeric DEFAULT 0 NOT NULL,
    "bundle_height" numeric DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."audit_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_log_id_seq"'::"regclass");


--
-- Name: counting id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."counting" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."counting_id_seq"'::"regclass");


--
-- Name: damage_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."damage_requests" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."damage_requests_id_seq"'::"regclass");


--
-- Name: delivery_confirmations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."delivery_confirmations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."delivery_confirmations_id_seq"'::"regclass");


--
-- Name: delivery_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."delivery_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."delivery_items_id_seq"'::"regclass");


--
-- Name: driver_activity_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."driver_activity_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."driver_activity_log_id_seq"'::"regclass");


--
-- Name: driver_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."driver_users" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."driver_users_id_seq"'::"regclass");


--
-- Name: driver_work_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."driver_work_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."driver_work_logs_id_seq"'::"regclass");


--
-- Name: gps_activity_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."gps_activity_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."gps_activity_log_id_seq"'::"regclass");


--
-- Name: kpi_wh_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."kpi_wh_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."kpi_wh_log_id_seq"'::"regclass");


--
-- Name: onhand_rm id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."onhand_rm" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."onhand_rm_id_seq"'::"regclass");


--
-- Name: print_tag_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."print_tag_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."print_tag_log_id_seq"'::"regclass");


--
-- Name: production_block id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."production_block" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."production_block_id_seq"'::"regclass");


--
-- Name: semi_fg_mapping id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."semi_fg_mapping" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."semi_fg_mapping_id_seq"'::"regclass");


--
-- Name: sheet_plan id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."sheet_plan" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sheet_plan_id_seq"'::"regclass");


--
-- Name: shop_visits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."shop_visits" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."shop_visits_id_seq"'::"regclass");


--
-- Name: stock_count_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."stock_count_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."stock_count_items_id_seq"'::"regclass");


--
-- Name: stock_count_semi id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."stock_count_semi" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."stock_count_semi_id_seq"'::"regclass");


--
-- Name: stock_count_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."stock_count_sessions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."stock_count_sessions_id_seq"'::"regclass");


--
-- Name: training_participants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."training_participants" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."training_participants_id_seq"'::"regclass");


--
-- Name: training_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."training_sessions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."training_sessions_id_seq"'::"regclass");


--
-- Name: transection_fg id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."transection_fg" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."transection_fg_id_seq"'::"regclass");


--
-- Name: transection_semi id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."transection_semi" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."transection_semi_id_seq"'::"regclass");


--
-- Name: truck_inspections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."truck_inspections" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."truck_inspections_id_seq"'::"regclass");


--
-- Name: wh_activity_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wh_activity_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."wh_activity_log_id_seq"'::"regclass");


--
-- Name: zone_capacity_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."zone_capacity_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."zone_capacity_log_id_seq"'::"regclass");


--
-- Name: analytics_cache analytics_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."analytics_cache"
    ADD CONSTRAINT "analytics_cache_pkey" PRIMARY KEY ("cache_key");


--
-- Name: app_config app_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."app_config"
    ADD CONSTRAINT "app_config_pkey" PRIMARY KEY ("key");


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");


--
-- Name: block_rules block_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."block_rules"
    ADD CONSTRAINT "block_rules_pkey" PRIMARY KEY ("id");


--
-- Name: counting counting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."counting"
    ADD CONSTRAINT "counting_pkey" PRIMARY KEY ("id");


--
-- Name: damage_requests damage_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."damage_requests"
    ADD CONSTRAINT "damage_requests_pkey" PRIMARY KEY ("id");


--
-- Name: delivery_confirmations delivery_confirmations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."delivery_confirmations"
    ADD CONSTRAINT "delivery_confirmations_pkey" PRIMARY KEY ("id");


--
-- Name: delivery_items delivery_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."delivery_items"
    ADD CONSTRAINT "delivery_items_pkey" PRIMARY KEY ("id");


--
-- Name: driver_activity_log driver_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."driver_activity_log"
    ADD CONSTRAINT "driver_activity_log_pkey" PRIMARY KEY ("id");


--
-- Name: driver_incidents driver_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."driver_incidents"
    ADD CONSTRAINT "driver_incidents_pkey" PRIMARY KEY ("id");


--
-- Name: driver_users driver_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."driver_users"
    ADD CONSTRAINT "driver_users_pkey" PRIMARY KEY ("id");


--
-- Name: driver_users driver_users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."driver_users"
    ADD CONSTRAINT "driver_users_username_key" UNIQUE ("username");


--
-- Name: driver_work_logs driver_work_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."driver_work_logs"
    ADD CONSTRAINT "driver_work_logs_pkey" PRIMARY KEY ("id");


--
-- Name: gps_activity_log gps_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."gps_activity_log"
    ADD CONSTRAINT "gps_activity_log_pkey" PRIMARY KEY ("id");


--
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."holidays"
    ADD CONSTRAINT "holidays_pkey" PRIMARY KEY ("holiday_date");


--
-- Name: inventory_daily_snapshot inventory_daily_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."inventory_daily_snapshot"
    ADD CONSTRAINT "inventory_daily_snapshot_pkey" PRIMARY KEY ("snapshot_date");


--
-- Name: kpi_inventory kpi_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."kpi_inventory"
    ADD CONSTRAINT "kpi_inventory_pkey" PRIMARY KEY ("id");


--
-- Name: kpi_wh_log kpi_wh_log_cycle_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."kpi_wh_log"
    ADD CONSTRAINT "kpi_wh_log_cycle_date_key" UNIQUE ("cycle_date");


--
-- Name: kpi_wh_log kpi_wh_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."kpi_wh_log"
    ADD CONSTRAINT "kpi_wh_log_pkey" PRIMARY KEY ("id");


--
-- Name: loading_orders loading_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."loading_orders"
    ADD CONSTRAINT "loading_orders_pkey" PRIMARY KEY ("id");


--
-- Name: loading_sessions loading_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."loading_sessions"
    ADD CONSTRAINT "loading_sessions_pkey" PRIMARY KEY ("id");


--
-- Name: logi_drivers logi_drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."logi_drivers"
    ADD CONSTRAINT "logi_drivers_pkey" PRIMARY KEY ("id");


--
-- Name: logi_shops logi_shops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."logi_shops"
    ADD CONSTRAINT "logi_shops_pkey" PRIMARY KEY ("id");


--
-- Name: logi_transports logi_transports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."logi_transports"
    ADD CONSTRAINT "logi_transports_pkey" PRIMARY KEY ("id");


--
-- Name: logi_trucks logi_trucks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."logi_trucks"
    ADD CONSTRAINT "logi_trucks_pkey" PRIMARY KEY ("plate");


--
-- Name: logi_wh_staff logi_wh_staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."logi_wh_staff"
    ADD CONSTRAINT "logi_wh_staff_pkey" PRIMARY KEY ("id");


--
-- Name: logistic_plans logistic_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."logistic_plans"
    ADD CONSTRAINT "logistic_plans_pkey" PRIMARY KEY ("plan_id");


--
-- Name: move_log move_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."move_log"
    ADD CONSTRAINT "move_log_pkey" PRIMARY KEY ("id");


--
-- Name: onhand_fg onhand_fg_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."onhand_fg"
    ADD CONSTRAINT "onhand_fg_pkey" PRIMARY KEY ("item_number", "warehouse");


--
-- Name: onhand onhand_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."onhand"
    ADD CONSTRAINT "onhand_pkey" PRIMARY KEY ("sku", "warehouse");


--
-- Name: onhand_rm onhand_rm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."onhand_rm"
    ADD CONSTRAINT "onhand_rm_pkey" PRIMARY KEY ("id");


--
-- Name: onhand_semi onhand_semi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."onhand_semi"
    ADD CONSTRAINT "onhand_semi_pkey" PRIMARY KEY ("item_number", "warehouse", "serial_number");


--
-- Name: print_tag_log print_tag_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."print_tag_log"
    ADD CONSTRAINT "print_tag_log_pkey" PRIMARY KEY ("id");


--
-- Name: production_block_cache production_block_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."production_block_cache"
    ADD CONSTRAINT "production_block_cache_pkey" PRIMARY KEY ("month_key");


--
-- Name: production_block production_block_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."production_block"
    ADD CONSTRAINT "production_block_pkey" PRIMARY KEY ("id");


--
-- Name: production_plan_cache production_plan_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."production_plan_cache"
    ADD CONSTRAINT "production_plan_cache_pkey" PRIMARY KEY ("month_key");


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("sku");


--
-- Name: push_subscriptions push_subscriptions_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint");


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");


--
-- Name: semi_fg_mapping semi_fg_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."semi_fg_mapping"
    ADD CONSTRAINT "semi_fg_mapping_pkey" PRIMARY KEY ("id");


--
-- Name: semi_fg_mapping semi_fg_mapping_semi_item_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."semi_fg_mapping"
    ADD CONSTRAINT "semi_fg_mapping_semi_item_key" UNIQUE ("semi_item");


--
-- Name: sheet_plan sheet_plan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."sheet_plan"
    ADD CONSTRAINT "sheet_plan_pkey" PRIMARY KEY ("id");


--
-- Name: shop_visits shop_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."shop_visits"
    ADD CONSTRAINT "shop_visits_pkey" PRIMARY KEY ("id");


--
-- Name: shop_visits shop_visits_plan_id_shop_seq_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."shop_visits"
    ADD CONSTRAINT "shop_visits_plan_id_shop_seq_key" UNIQUE ("plan_id", "shop_seq");


--
-- Name: stock_count_items stock_count_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."stock_count_items"
    ADD CONSTRAINT "stock_count_items_pkey" PRIMARY KEY ("id");


--
-- Name: stock_count_semi stock_count_semi_count_date_semi_item_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."stock_count_semi"
    ADD CONSTRAINT "stock_count_semi_count_date_semi_item_key" UNIQUE ("count_date", "semi_item");


--
-- Name: stock_count_semi stock_count_semi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."stock_count_semi"
    ADD CONSTRAINT "stock_count_semi_pkey" PRIMARY KEY ("id");


--
-- Name: stock_count_sessions stock_count_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."stock_count_sessions"
    ADD CONSTRAINT "stock_count_sessions_pkey" PRIMARY KEY ("id");


--
-- Name: training_participants training_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."training_participants"
    ADD CONSTRAINT "training_participants_pkey" PRIMARY KEY ("id");


--
-- Name: training_participants training_participants_session_id_driver_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."training_participants"
    ADD CONSTRAINT "training_participants_session_id_driver_username_key" UNIQUE ("session_id", "driver_username");


--
-- Name: training_sessions training_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."training_sessions"
    ADD CONSTRAINT "training_sessions_pkey" PRIMARY KEY ("id");


--
-- Name: transection_fg transection_fg_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."transection_fg"
    ADD CONSTRAINT "transection_fg_pkey" PRIMARY KEY ("id");


--
-- Name: transection_semi transection_semi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."transection_semi"
    ADD CONSTRAINT "transection_semi_pkey" PRIMARY KEY ("id");


--
-- Name: trip_logs trip_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trip_logs"
    ADD CONSTRAINT "trip_logs_pkey" PRIMARY KEY ("plan_id");


--
-- Name: truck_inspections truck_inspections_driver_plate_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."truck_inspections"
    ADD CONSTRAINT "truck_inspections_driver_plate_date_key" UNIQUE ("inspect_date", "truck_plate", "driver_id");


--
-- Name: truck_inspections truck_inspections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."truck_inspections"
    ADD CONSTRAINT "truck_inspections_pkey" PRIMARY KEY ("id");


--
-- Name: wh_activity_log wh_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wh_activity_log"
    ADD CONSTRAINT "wh_activity_log_pkey" PRIMARY KEY ("id");


--
-- Name: wh_eval_skills wh_eval_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wh_eval_skills"
    ADD CONSTRAINT "wh_eval_skills_pkey" PRIMARY KEY ("id");


--
-- Name: wh_evaluations wh_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wh_evaluations"
    ADD CONSTRAINT "wh_evaluations_pkey" PRIMARY KEY ("id");


--
-- Name: wms_users wms_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wms_users"
    ADD CONSTRAINT "wms_users_pkey" PRIMARY KEY ("username");


--
-- Name: work_orders work_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id");


--
-- Name: zone_capacity_log zone_capacity_log_log_date_zone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."zone_capacity_log"
    ADD CONSTRAINT "zone_capacity_log_log_date_zone_key" UNIQUE ("log_date", "zone");


--
-- Name: zone_capacity_log zone_capacity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."zone_capacity_log"
    ADD CONSTRAINT "zone_capacity_log_pkey" PRIMARY KEY ("id");


--
-- Name: zone_configs zone_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."zone_configs"
    ADD CONSTRAINT "zone_configs_pkey" PRIMARY KEY ("key");


--
-- Name: zone_stock zone_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."zone_stock"
    ADD CONSTRAINT "zone_stock_pkey" PRIMARY KEY ("zone", "sku");


--
-- Name: idx_counting_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_counting_date" ON "public"."counting" USING "btree" ("count_date");


--
-- Name: idx_counting_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_counting_item" ON "public"."counting" USING "btree" ("item_number");


--
-- Name: idx_delconf_driver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_delconf_driver" ON "public"."delivery_confirmations" USING "btree" ("driver_username");


--
-- Name: idx_delconf_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_delconf_plan" ON "public"."delivery_confirmations" USING "btree" ("plan_id");


--
-- Name: idx_delconf_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_delconf_status" ON "public"."delivery_confirmations" USING "btree" ("status");


--
-- Name: idx_delivery_items_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_delivery_items_date" ON "public"."delivery_items" USING "btree" ("delivery_date");


--
-- Name: idx_delivery_items_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_delivery_items_sku" ON "public"."delivery_items" USING "btree" ("sku");


--
-- Name: idx_dworklog_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_dworklog_date" ON "public"."driver_work_logs" USING "btree" ("work_date");


--
-- Name: idx_dworklog_driver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_dworklog_driver" ON "public"."driver_work_logs" USING "btree" ("driver_username");


--
-- Name: idx_gps_log_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_gps_log_date" ON "public"."gps_activity_log" USING "btree" ("activity_date");


--
-- Name: idx_gps_log_driver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_gps_log_driver" ON "public"."gps_activity_log" USING "btree" ("driver");


--
-- Name: idx_gps_log_truck; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_gps_log_truck" ON "public"."gps_activity_log" USING "btree" ("truck");


--
-- Name: idx_logistic_plans_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_logistic_plans_date" ON "public"."logistic_plans" USING "btree" ("plan_date");


--
-- Name: idx_logistic_plans_pair; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_logistic_plans_pair" ON "public"."logistic_plans" USING "btree" ("pair_id");


--
-- Name: idx_logistic_plans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_logistic_plans_status" ON "public"."logistic_plans" USING "btree" ("status");


--
-- Name: idx_move_log_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_move_log_date" ON "public"."move_log" USING "btree" ("move_date");


--
-- Name: idx_print_tag_log_print_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_print_tag_log_print_date" ON "public"."print_tag_log" USING "btree" ("print_date");


--
-- Name: idx_print_tag_log_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_print_tag_log_sku" ON "public"."print_tag_log" USING "btree" ("sku");


--
-- Name: idx_production_block_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_production_block_date" ON "public"."production_block" USING "btree" ("block_date");


--
-- Name: idx_production_plan_cache_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_production_plan_cache_month" ON "public"."production_plan_cache" USING "btree" ("month_key");


--
-- Name: idx_push_subs_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_push_subs_username" ON "public"."push_subscriptions" USING "btree" ("username");


--
-- Name: idx_sheet_plan_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_sheet_plan_date" ON "public"."sheet_plan" USING "btree" ("plan_date");


--
-- Name: idx_transection_fg_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_transection_fg_date" ON "public"."transection_fg" USING "btree" ("physical_date");


--
-- Name: idx_transection_fg_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_transection_fg_item" ON "public"."transection_fg" USING "btree" ("item_number");


--
-- Name: idx_wh_activity_log_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_wh_activity_log_date" ON "public"."wh_activity_log" USING "btree" ("date");


--
-- Name: idx_wh_activity_log_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_wh_activity_log_team" ON "public"."wh_activity_log" USING "btree" ("team");


--
-- Name: idx_wh_eval_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_wh_eval_month" ON "public"."wh_evaluations" USING "btree" ("eval_month");


--
-- Name: idx_wh_eval_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_wh_eval_staff" ON "public"."wh_evaluations" USING "btree" ("staff_id");


--
-- Name: idx_work_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_work_orders_status" ON "public"."work_orders" USING "btree" ("status");


--
-- Name: idx_zone_stock_zone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_zone_stock_zone" ON "public"."zone_stock" USING "btree" ("zone");


--
-- Name: loading_orders_order_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "loading_orders_order_date_idx" ON "public"."loading_orders" USING "btree" ("order_date");


--
-- Name: loading_orders_plan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "loading_orders_plan_id_idx" ON "public"."loading_orders" USING "btree" ("plan_id");


--
-- Name: loading_sessions_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "loading_sessions_order_id_idx" ON "public"."loading_sessions" USING "btree" ("order_id");


--
-- Name: loading_sessions_plan_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "loading_sessions_plan_date_idx" ON "public"."loading_sessions" USING "btree" ("plan_date");


--
-- Name: loading_sessions_plan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "loading_sessions_plan_id_idx" ON "public"."loading_sessions" USING "btree" ("plan_id");


--
-- Name: loading_sessions loading_sessions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."loading_sessions"
    ADD CONSTRAINT "loading_sessions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."loading_orders"("id") ON DELETE SET NULL;


--
-- Name: stock_count_items stock_count_items_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."stock_count_items"
    ADD CONSTRAINT "stock_count_items_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."stock_count_sessions"("id") ON DELETE CASCADE;


--
-- Name: training_participants training_participants_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."training_participants"
    ADD CONSTRAINT "training_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."training_sessions"("id") ON DELETE CASCADE;


--
-- Name: wh_activity_log wh_activity_log_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."wh_activity_log"
    ADD CONSTRAINT "wh_activity_log_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."loading_orders"("id");


--
-- Name: loading_orders allow all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow all" ON "public"."loading_orders" TO "authenticated", "anon" USING (true) WITH CHECK (true);


--
-- Name: loading_sessions allow all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow all" ON "public"."loading_sessions" TO "authenticated", "anon" USING (true) WITH CHECK (true);


--
-- Name: stock_count_semi allow all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow all" ON "public"."stock_count_semi" USING (true);


--
-- Name: transection_semi allow all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow all" ON "public"."transection_semi" USING (true);


--
-- Name: zone_capacity_log allow all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow all" ON "public"."zone_capacity_log" USING (true);


--
-- Name: stock_count_semi allow all stock_count_semi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow all stock_count_semi" ON "public"."stock_count_semi" TO "authenticated", "anon" USING (true) WITH CHECK (true);


--
-- Name: wh_eval_skills allow all wh_eval_skills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow all wh_eval_skills" ON "public"."wh_eval_skills" USING (true) WITH CHECK (true);


--
-- Name: wh_evaluations allow all wh_evaluations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow all wh_evaluations" ON "public"."wh_evaluations" USING (true) WITH CHECK (true);


--
-- Name: onhand_fg allow anon read onhand_fg; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow anon read onhand_fg" ON "public"."onhand_fg" FOR SELECT TO "anon" USING (true);


--
-- Name: transection_semi allow delete transection_semi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow delete transection_semi" ON "public"."transection_semi" FOR DELETE TO "authenticated", "anon" USING (true);


--
-- Name: transection_semi allow insert transection_semi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow insert transection_semi" ON "public"."transection_semi" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);


--
-- Name: transection_semi allow select transection_semi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow select transection_semi" ON "public"."transection_semi" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: damage_requests allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all" ON "public"."damage_requests" USING (true) WITH CHECK (true);


--
-- Name: onhand_rm allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all" ON "public"."onhand_rm" USING (true) WITH CHECK (true);


--
-- Name: print_tag_log allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all" ON "public"."print_tag_log" USING (true) WITH CHECK (true);


--
-- Name: training_participants allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all" ON "public"."training_participants" USING (true) WITH CHECK (true);


--
-- Name: training_sessions allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all" ON "public"."training_sessions" USING (true) WITH CHECK (true);


--
-- Name: zone_capacity_log allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all" ON "public"."zone_capacity_log" USING (true) WITH CHECK (true);


--
-- Name: audit_log allow_all_audit_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all_audit_log" ON "public"."audit_log" USING (true) WITH CHECK (true);


--
-- Name: counting allow_all_counting; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all_counting" ON "public"."counting" USING (true) WITH CHECK (true);


--
-- Name: driver_incidents allow_all_incidents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all_incidents" ON "public"."driver_incidents" USING (true) WITH CHECK (true);


--
-- Name: stock_count_items allow_all_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all_items" ON "public"."stock_count_items" TO "authenticated", "anon" USING (true) WITH CHECK (true);


--
-- Name: kpi_inventory allow_all_kpi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all_kpi" ON "public"."kpi_inventory" USING (true) WITH CHECK (true);


--
-- Name: kpi_wh_log allow_all_kpi_wh_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all_kpi_wh_log" ON "public"."kpi_wh_log" USING (true) WITH CHECK (true);


--
-- Name: move_log allow_all_move_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all_move_log" ON "public"."move_log" USING (true) WITH CHECK (true);


--
-- Name: onhand_fg allow_all_onhand_fg; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all_onhand_fg" ON "public"."onhand_fg" USING (true) WITH CHECK (true);


--
-- Name: onhand_semi allow_all_onhand_semi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all_onhand_semi" ON "public"."onhand_semi" USING (true) WITH CHECK (true);


--
-- Name: stock_count_items allow_all_sc_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all_sc_items" ON "public"."stock_count_items" USING (true) WITH CHECK (true);


--
-- Name: stock_count_sessions allow_all_sc_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all_sc_sessions" ON "public"."stock_count_sessions" USING (true) WITH CHECK (true);


--
-- Name: semi_fg_mapping allow_all_semi_fg_mapping; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all_semi_fg_mapping" ON "public"."semi_fg_mapping" USING (true) WITH CHECK (true);


--
-- Name: stock_count_sessions allow_all_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all_sessions" ON "public"."stock_count_sessions" TO "authenticated", "anon" USING (true) WITH CHECK (true);


--
-- Name: transection_fg allow_all_transection_fg; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all_transection_fg" ON "public"."transection_fg" USING (true) WITH CHECK (true);


--
-- Name: truck_inspections allow_all_truck_inspections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all_truck_inspections" ON "public"."truck_inspections" USING (true) WITH CHECK (true);


--
-- Name: wh_activity_log allow_all_wh_activity_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all_wh_activity_log" ON "public"."wh_activity_log" USING (true) WITH CHECK (true);


--
-- Name: wms_users allow_all_wms_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all_wms_users" ON "public"."wms_users" USING (true) WITH CHECK (true);


--
-- Name: work_orders allow_all_work_orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all_work_orders" ON "public"."work_orders" USING (true) WITH CHECK (true);


--
-- Name: zone_stock allow_all_zone_stock; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_all_zone_stock" ON "public"."zone_stock" USING (true) WITH CHECK (true);


--
-- Name: driver_activity_log allow_anon_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_anon_insert" ON "public"."driver_activity_log" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);


--
-- Name: logistic_plans allow_anon_update_logistic_plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_anon_update_logistic_plans" ON "public"."logistic_plans" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);


--
-- Name: driver_incidents allow_insert_incidents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_insert_incidents" ON "public"."driver_incidents" FOR INSERT WITH CHECK (true);


--
-- Name: driver_incidents allow_read_incidents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_read_incidents" ON "public"."driver_incidents" FOR SELECT USING (true);


--
-- Name: onhand allow_read_onhand; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_read_onhand" ON "public"."onhand" USING (true) WITH CHECK (true);


--
-- Name: onhand_fg allow_read_onhand_fg; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_read_onhand_fg" ON "public"."onhand_fg" FOR SELECT USING (true);


--
-- Name: production_block allow_read_production_block; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_read_production_block" ON "public"."production_block" USING (true) WITH CHECK (true);


--
-- Name: products allow_read_products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_read_products" ON "public"."products" USING (true) WITH CHECK (true);


--
-- Name: sheet_plan allow_read_sheet_plan; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_read_sheet_plan" ON "public"."sheet_plan" USING (true) WITH CHECK (true);


--
-- Name: driver_incidents allow_update_incidents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow_update_incidents" ON "public"."driver_incidents" FOR UPDATE USING (true);


--
-- Name: analytics_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."analytics_cache" ENABLE ROW LEVEL SECURITY;

--
-- Name: analytics_cache analytics_cache_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "analytics_cache_all" ON "public"."analytics_cache" USING (true) WITH CHECK (true);


--
-- Name: app_config anon_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anon_all" ON "public"."app_config" TO "anon" USING (true) WITH CHECK (true);


--
-- Name: production_block_cache anon_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anon_all" ON "public"."production_block_cache" TO "anon" USING (true) WITH CHECK (true);


--
-- Name: production_plan_cache anon_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anon_all" ON "public"."production_plan_cache" TO "anon" USING (true) WITH CHECK (true);


--
-- Name: zone_capacity_log anon_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anon_all" ON "public"."zone_capacity_log" TO "anon" USING (true) WITH CHECK (true);


--
-- Name: app_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."app_config" ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;

--
-- Name: block_rules auth insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "auth insert" ON "public"."block_rules" USING (true);


--
-- Name: block_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."block_rules" ENABLE ROW LEVEL SECURITY;

--
-- Name: counting; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."counting" ENABLE ROW LEVEL SECURITY;

--
-- Name: damage_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."damage_requests" ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_confirmations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."delivery_confirmations" ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_confirmations delivery_confirmations_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "delivery_confirmations_all" ON "public"."delivery_confirmations" USING (true) WITH CHECK (true);


--
-- Name: delivery_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."delivery_items" ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_items delivery_items_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "delivery_items_all" ON "public"."delivery_items" USING (true) WITH CHECK (true);


--
-- Name: driver_activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."driver_activity_log" ENABLE ROW LEVEL SECURITY;

--
-- Name: driver_incidents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."driver_incidents" ENABLE ROW LEVEL SECURITY;

--
-- Name: driver_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."driver_users" ENABLE ROW LEVEL SECURITY;

--
-- Name: driver_users driver_users_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "driver_users_all" ON "public"."driver_users" USING (true) WITH CHECK (true);


--
-- Name: driver_work_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."driver_work_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: driver_work_logs driver_work_logs_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "driver_work_logs_all" ON "public"."driver_work_logs" USING (true) WITH CHECK (true);


--
-- Name: gps_activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."gps_activity_log" ENABLE ROW LEVEL SECURITY;

--
-- Name: gps_activity_log gps_activity_log_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "gps_activity_log_all" ON "public"."gps_activity_log" USING (true) WITH CHECK (true);


--
-- Name: holidays; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."holidays" ENABLE ROW LEVEL SECURITY;

--
-- Name: holidays holidays_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "holidays_all" ON "public"."holidays" USING (true) WITH CHECK (true);


--
-- Name: kpi_inventory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."kpi_inventory" ENABLE ROW LEVEL SECURITY;

--
-- Name: kpi_wh_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."kpi_wh_log" ENABLE ROW LEVEL SECURITY;

--
-- Name: loading_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."loading_orders" ENABLE ROW LEVEL SECURITY;

--
-- Name: loading_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."loading_sessions" ENABLE ROW LEVEL SECURITY;

--
-- Name: logi_drivers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."logi_drivers" ENABLE ROW LEVEL SECURITY;

--
-- Name: logi_drivers logi_drivers_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "logi_drivers_all" ON "public"."logi_drivers" USING (true) WITH CHECK (true);


--
-- Name: logi_shops; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."logi_shops" ENABLE ROW LEVEL SECURITY;

--
-- Name: logi_shops logi_shops_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "logi_shops_all" ON "public"."logi_shops" USING (true) WITH CHECK (true);


--
-- Name: logi_transports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."logi_transports" ENABLE ROW LEVEL SECURITY;

--
-- Name: logi_transports logi_transports_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "logi_transports_all" ON "public"."logi_transports" USING (true) WITH CHECK (true);


--
-- Name: logi_trucks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."logi_trucks" ENABLE ROW LEVEL SECURITY;

--
-- Name: logi_trucks logi_trucks_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "logi_trucks_all" ON "public"."logi_trucks" USING (true) WITH CHECK (true);


--
-- Name: logi_wh_staff; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."logi_wh_staff" ENABLE ROW LEVEL SECURITY;

--
-- Name: logi_wh_staff logi_wh_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "logi_wh_staff_all" ON "public"."logi_wh_staff" USING (true) WITH CHECK (true);


--
-- Name: logistic_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."logistic_plans" ENABLE ROW LEVEL SECURITY;

--
-- Name: logistic_plans logistic_plans_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "logistic_plans_all" ON "public"."logistic_plans" USING (true) WITH CHECK (true);


--
-- Name: move_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."move_log" ENABLE ROW LEVEL SECURITY;

--
-- Name: onhand; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."onhand" ENABLE ROW LEVEL SECURITY;

--
-- Name: onhand_fg; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."onhand_fg" ENABLE ROW LEVEL SECURITY;

--
-- Name: onhand_fg onhand_fg_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "onhand_fg_all" ON "public"."onhand_fg" USING (true) WITH CHECK (true);


--
-- Name: onhand_rm; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."onhand_rm" ENABLE ROW LEVEL SECURITY;

--
-- Name: onhand_semi; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."onhand_semi" ENABLE ROW LEVEL SECURITY;

--
-- Name: onhand_semi onhand_semi_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "onhand_semi_all" ON "public"."onhand_semi" USING (true) WITH CHECK (true);


--
-- Name: print_tag_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."print_tag_log" ENABLE ROW LEVEL SECURITY;

--
-- Name: production_block; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."production_block" ENABLE ROW LEVEL SECURITY;

--
-- Name: production_block_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."production_block_cache" ENABLE ROW LEVEL SECURITY;

--
-- Name: production_plan_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."production_plan_cache" ENABLE ROW LEVEL SECURITY;

--
-- Name: production_plan_cache production_plan_cache_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "production_plan_cache_all" ON "public"."production_plan_cache" USING (true) WITH CHECK (true);


--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;

--
-- Name: block_rules public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read" ON "public"."block_rules" FOR SELECT TO "anon" USING (true);


--
-- Name: move_log public_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public_all" ON "public"."move_log" USING (true) WITH CHECK (true);


--
-- Name: work_orders public_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public_all" ON "public"."work_orders" USING (true) WITH CHECK (true);


--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;

--
-- Name: semi_fg_mapping; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."semi_fg_mapping" ENABLE ROW LEVEL SECURITY;

--
-- Name: sheet_plan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."sheet_plan" ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_visits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."shop_visits" ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_visits shop_visits_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "shop_visits_all" ON "public"."shop_visits" USING (true) WITH CHECK (true);


--
-- Name: stock_count_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."stock_count_items" ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_count_semi; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."stock_count_semi" ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_count_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."stock_count_sessions" ENABLE ROW LEVEL SECURITY;

--
-- Name: training_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."training_participants" ENABLE ROW LEVEL SECURITY;

--
-- Name: training_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."training_sessions" ENABLE ROW LEVEL SECURITY;

--
-- Name: transection_fg; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."transection_fg" ENABLE ROW LEVEL SECURITY;

--
-- Name: transection_semi; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."transection_semi" ENABLE ROW LEVEL SECURITY;

--
-- Name: trip_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."trip_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: trip_logs trip_logs_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "trip_logs_all" ON "public"."trip_logs" USING (true) WITH CHECK (true);


--
-- Name: truck_inspections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."truck_inspections" ENABLE ROW LEVEL SECURITY;

--
-- Name: wh_activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wh_activity_log" ENABLE ROW LEVEL SECURITY;

--
-- Name: wh_eval_skills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wh_eval_skills" ENABLE ROW LEVEL SECURITY;

--
-- Name: wh_evaluations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wh_evaluations" ENABLE ROW LEVEL SECURITY;

--
-- Name: wms_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."wms_users" ENABLE ROW LEVEL SECURITY;

--
-- Name: work_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."work_orders" ENABLE ROW LEVEL SECURITY;

--
-- Name: zone_capacity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."zone_capacity_log" ENABLE ROW LEVEL SECURITY;

--
-- Name: zone_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."zone_configs" ENABLE ROW LEVEL SECURITY;

--
-- Name: zone_configs zone_configs_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "zone_configs_all" ON "public"."zone_configs" USING (true) WITH CHECK (true);


--
-- Name: zone_stock; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."zone_stock" ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA "public"; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


--
-- Name: TABLE "analytics_cache"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."analytics_cache" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."analytics_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_cache" TO "service_role";


--
-- Name: TABLE "app_config"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."app_config" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."app_config" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."app_config" TO "service_role";


--
-- Name: TABLE "audit_log"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";


--
-- Name: SEQUENCE "audit_log_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."audit_log_id_seq" TO "authenticated";


--
-- Name: TABLE "block_rules"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."block_rules" TO "anon";
GRANT ALL ON TABLE "public"."block_rules" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."block_rules" TO "service_role";


--
-- Name: TABLE "counting"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."counting" TO "anon";
GRANT ALL ON TABLE "public"."counting" TO "authenticated";
GRANT ALL ON TABLE "public"."counting" TO "service_role";


--
-- Name: SEQUENCE "counting_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE "public"."counting_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."counting_id_seq" TO "authenticated";


--
-- Name: TABLE "damage_requests"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."damage_requests" TO "anon";
GRANT ALL ON TABLE "public"."damage_requests" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."damage_requests" TO "service_role";


--
-- Name: SEQUENCE "damage_requests_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE "public"."damage_requests_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."damage_requests_id_seq" TO "authenticated";


--
-- Name: TABLE "delivery_confirmations"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."delivery_confirmations" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."delivery_confirmations" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_confirmations" TO "service_role";


--
-- Name: SEQUENCE "delivery_confirmations_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE "public"."delivery_confirmations_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."delivery_confirmations_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."delivery_confirmations_id_seq" TO "authenticated";


--
-- Name: TABLE "delivery_items"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."delivery_items" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."delivery_items" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_items" TO "service_role";


--
-- Name: SEQUENCE "delivery_items_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE "public"."delivery_items_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."delivery_items_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."delivery_items_id_seq" TO "authenticated";


--
-- Name: TABLE "driver_activity_log"; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."driver_activity_log" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."driver_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."driver_activity_log" TO "service_role";


--
-- Name: SEQUENCE "driver_activity_log_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE "public"."driver_activity_log_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."driver_activity_log_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."driver_activity_log_id_seq" TO "authenticated";


--
-- Name: TABLE "driver_incidents"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."driver_incidents" TO "anon";
GRANT ALL ON TABLE "public"."driver_incidents" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."driver_incidents" TO "service_role";


--
-- Name: TABLE "driver_users"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."driver_users" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."driver_users" TO "authenticated";
GRANT ALL ON TABLE "public"."driver_users" TO "service_role";


--
-- Name: SEQUENCE "driver_users_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE "public"."driver_users_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."driver_users_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."driver_users_id_seq" TO "authenticated";


--
-- Name: TABLE "driver_work_logs"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."driver_work_logs" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."driver_work_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."driver_work_logs" TO "service_role";


--
-- Name: SEQUENCE "driver_work_logs_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE "public"."driver_work_logs_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."driver_work_logs_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."driver_work_logs_id_seq" TO "authenticated";


--
-- Name: TABLE "gps_activity_log"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."gps_activity_log" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."gps_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."gps_activity_log" TO "service_role";


--
-- Name: SEQUENCE "gps_activity_log_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE "public"."gps_activity_log_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."gps_activity_log_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."gps_activity_log_id_seq" TO "authenticated";


--
-- Name: TABLE "holidays"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."holidays" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."holidays" TO "authenticated";
GRANT ALL ON TABLE "public"."holidays" TO "service_role";


--
-- Name: TABLE "inventory_daily_snapshot"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."inventory_daily_snapshot" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."inventory_daily_snapshot" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."inventory_daily_snapshot" TO "service_role";


--
-- Name: TABLE "kpi_inventory"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."kpi_inventory" TO "anon";
GRANT ALL ON TABLE "public"."kpi_inventory" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."kpi_inventory" TO "service_role";


--
-- Name: TABLE "kpi_wh_log"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."kpi_wh_log" TO "anon";
GRANT ALL ON TABLE "public"."kpi_wh_log" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_wh_log" TO "service_role";


--
-- Name: SEQUENCE "kpi_wh_log_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE "public"."kpi_wh_log_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."kpi_wh_log_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."kpi_wh_log_id_seq" TO "authenticated";


--
-- Name: TABLE "loading_orders"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."loading_orders" TO "anon";
GRANT ALL ON TABLE "public"."loading_orders" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."loading_orders" TO "service_role";


--
-- Name: TABLE "loading_sessions"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."loading_sessions" TO "anon";
GRANT ALL ON TABLE "public"."loading_sessions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."loading_sessions" TO "service_role";


--
-- Name: TABLE "logi_drivers"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."logi_drivers" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."logi_drivers" TO "authenticated";
GRANT ALL ON TABLE "public"."logi_drivers" TO "service_role";


--
-- Name: TABLE "logi_shops"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."logi_shops" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."logi_shops" TO "authenticated";
GRANT ALL ON TABLE "public"."logi_shops" TO "service_role";


--
-- Name: TABLE "logi_transports"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."logi_transports" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."logi_transports" TO "authenticated";
GRANT ALL ON TABLE "public"."logi_transports" TO "service_role";


--
-- Name: TABLE "logi_trucks"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."logi_trucks" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."logi_trucks" TO "authenticated";
GRANT ALL ON TABLE "public"."logi_trucks" TO "service_role";


--
-- Name: TABLE "logi_wh_staff"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."logi_wh_staff" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."logi_wh_staff" TO "authenticated";
GRANT ALL ON TABLE "public"."logi_wh_staff" TO "service_role";


--
-- Name: TABLE "logistic_plans"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."logistic_plans" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."logistic_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."logistic_plans" TO "service_role";


--
-- Name: TABLE "move_log"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."move_log" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."move_log" TO "authenticated";
GRANT ALL ON TABLE "public"."move_log" TO "service_role";


--
-- Name: TABLE "onhand"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."onhand" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."onhand" TO "authenticated";
GRANT ALL ON TABLE "public"."onhand" TO "service_role";


--
-- Name: TABLE "onhand_fg"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."onhand_fg" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."onhand_fg" TO "authenticated";
GRANT ALL ON TABLE "public"."onhand_fg" TO "service_role";


--
-- Name: TABLE "onhand_rm"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."onhand_rm" TO "anon";
GRANT ALL ON TABLE "public"."onhand_rm" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."onhand_rm" TO "service_role";


--
-- Name: SEQUENCE "onhand_rm_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE "public"."onhand_rm_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."onhand_rm_id_seq" TO "authenticated";


--
-- Name: TABLE "onhand_semi"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."onhand_semi" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."onhand_semi" TO "authenticated";
GRANT ALL ON TABLE "public"."onhand_semi" TO "service_role";


--
-- Name: TABLE "semi_fg_mapping"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."semi_fg_mapping" TO "anon";
GRANT ALL ON TABLE "public"."semi_fg_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."semi_fg_mapping" TO "service_role";


--
-- Name: TABLE "onhand_semi_full"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."onhand_semi_full" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."onhand_semi_full" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."onhand_semi_full" TO "service_role";


--
-- Name: TABLE "print_tag_log"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."print_tag_log" TO "anon";
GRANT ALL ON TABLE "public"."print_tag_log" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."print_tag_log" TO "service_role";


--
-- Name: SEQUENCE "print_tag_log_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE "public"."print_tag_log_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."print_tag_log_id_seq" TO "authenticated";


--
-- Name: TABLE "production_block"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."production_block" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."production_block" TO "authenticated";
GRANT ALL ON TABLE "public"."production_block" TO "service_role";


--
-- Name: TABLE "production_block_cache"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."production_block_cache" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."production_block_cache" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."production_block_cache" TO "service_role";


--
-- Name: SEQUENCE "production_block_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE "public"."production_block_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."production_block_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."production_block_id_seq" TO "authenticated";


--
-- Name: TABLE "production_plan_cache"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."production_plan_cache" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."production_plan_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."production_plan_cache" TO "service_role";


--
-- Name: TABLE "products"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";


--
-- Name: TABLE "push_subscriptions"; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."push_subscriptions" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."push_subscriptions" TO "service_role";


--
-- Name: SEQUENCE "semi_fg_mapping_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE "public"."semi_fg_mapping_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."semi_fg_mapping_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."semi_fg_mapping_id_seq" TO "authenticated";


--
-- Name: TABLE "sheet_plan"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."sheet_plan" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."sheet_plan" TO "authenticated";
GRANT ALL ON TABLE "public"."sheet_plan" TO "service_role";


--
-- Name: SEQUENCE "sheet_plan_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE "public"."sheet_plan_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."sheet_plan_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."sheet_plan_id_seq" TO "authenticated";


--
-- Name: TABLE "shop_visits"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."shop_visits" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."shop_visits" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."shop_visits" TO "service_role";


--
-- Name: SEQUENCE "shop_visits_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE "public"."shop_visits_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."shop_visits_id_seq" TO "authenticated";


--
-- Name: TABLE "stock_count_items"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."stock_count_items" TO "anon";
GRANT ALL ON TABLE "public"."stock_count_items" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_count_items" TO "service_role";


--
-- Name: SEQUENCE "stock_count_items_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE "public"."stock_count_items_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."stock_count_items_id_seq" TO "authenticated";


--
-- Name: TABLE "stock_count_semi"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."stock_count_semi" TO "anon";
GRANT ALL ON TABLE "public"."stock_count_semi" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."stock_count_semi" TO "service_role";


--
-- Name: SEQUENCE "stock_count_semi_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE "public"."stock_count_semi_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."stock_count_semi_id_seq" TO "authenticated";


--
-- Name: TABLE "stock_count_sessions"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."stock_count_sessions" TO "anon";
GRANT ALL ON TABLE "public"."stock_count_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_count_sessions" TO "service_role";


--
-- Name: SEQUENCE "stock_count_sessions_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE "public"."stock_count_sessions_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."stock_count_sessions_id_seq" TO "authenticated";


--
-- Name: TABLE "training_participants"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."training_participants" TO "anon";
GRANT ALL ON TABLE "public"."training_participants" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."training_participants" TO "service_role";


--
-- Name: SEQUENCE "training_participants_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE "public"."training_participants_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."training_participants_id_seq" TO "authenticated";


--
-- Name: TABLE "training_sessions"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."training_sessions" TO "anon";
GRANT ALL ON TABLE "public"."training_sessions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."training_sessions" TO "service_role";


--
-- Name: SEQUENCE "training_sessions_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE "public"."training_sessions_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."training_sessions_id_seq" TO "authenticated";


--
-- Name: TABLE "transection_fg"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."transection_fg" TO "anon";
GRANT ALL ON TABLE "public"."transection_fg" TO "authenticated";
GRANT ALL ON TABLE "public"."transection_fg" TO "service_role";


--
-- Name: SEQUENCE "transection_fg_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE "public"."transection_fg_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."transection_fg_id_seq" TO "authenticated";


--
-- Name: TABLE "transection_semi"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."transection_semi" TO "anon";
GRANT ALL ON TABLE "public"."transection_semi" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."transection_semi" TO "service_role";


--
-- Name: SEQUENCE "transection_semi_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE "public"."transection_semi_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."transection_semi_id_seq" TO "authenticated";


--
-- Name: TABLE "trip_logs"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."trip_logs" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trip_logs" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trip_logs" TO "service_role";


--
-- Name: TABLE "truck_inspections"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."truck_inspections" TO "anon";
GRANT ALL ON TABLE "public"."truck_inspections" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."truck_inspections" TO "service_role";


--
-- Name: SEQUENCE "truck_inspections_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE "public"."truck_inspections_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."truck_inspections_id_seq" TO "authenticated";


--
-- Name: TABLE "wh_activity_log"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."wh_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."wh_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."wh_activity_log" TO "service_role";


--
-- Name: SEQUENCE "wh_activity_log_id_seq"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE "public"."wh_activity_log_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."wh_activity_log_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."wh_activity_log_id_seq" TO "service_role";


--
-- Name: TABLE "wh_eval_skills"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."wh_eval_skills" TO "anon";
GRANT ALL ON TABLE "public"."wh_eval_skills" TO "authenticated";
GRANT ALL ON TABLE "public"."wh_eval_skills" TO "service_role";


--
-- Name: TABLE "wh_evaluations"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."wh_evaluations" TO "anon";
GRANT ALL ON TABLE "public"."wh_evaluations" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."wh_evaluations" TO "service_role";


--
-- Name: TABLE "wms_users"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."wms_users" TO "anon";
GRANT ALL ON TABLE "public"."wms_users" TO "authenticated";
GRANT ALL ON TABLE "public"."wms_users" TO "service_role";


--
-- Name: TABLE "work_orders"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."work_orders" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."work_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."work_orders" TO "service_role";


--
-- Name: TABLE "zone_capacity_log"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."zone_capacity_log" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."zone_capacity_log" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."zone_capacity_log" TO "service_role";


--
-- Name: TABLE "zone_configs"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."zone_configs" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."zone_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."zone_configs" TO "service_role";


--
-- Name: TABLE "zone_stock"; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE "public"."zone_stock" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."zone_stock" TO "authenticated";
GRANT ALL ON TABLE "public"."zone_stock" TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--


