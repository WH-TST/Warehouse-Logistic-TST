--
-- PostgreSQL database dump
--

\restrict t1LKMewSFJMRP4IBeEfo0OO1RuvCnywIvW7Ay9L7QG3B61gU3el0Sdo0HE7ogDp

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
-- Data for Name: wh_eval_skills; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."wh_eval_skills" ("id", "label", "apply_role", "weight", "created_at") FROM stdin;
d9e95f75-8819-4279-bee1-4e2ac781d8a0	ปฏิบัติตามกฎของความปลอดภัย	both	2	2026-07-10 04:53:17.283176+00
\.


--
-- Data for Name: wh_evaluations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."wh_evaluations" ("id", "staff_id", "staff_name", "role", "eval_month", "salary_current", "skills_done", "score", "salary_status", "notes", "created_at") FROM stdin;
0b5849af-e810-4998-9571-d983bc33f410	60059	MR.MYO WIN HTUT ( มูดิ )	lead	2026-07	14300	["crane_ops", "wms_entry", "stock_count", "prod_check", "zone_arr", "team_assign", "zone_assign", "recv_dec", "del_coord", "stock_coord", "bc_id"]	70	fair	\N	2026-07-08 12:58:34.278792+00
6264f9be-263c-46c9-bc84-cc195ef7d6f1	60037	MR. PHOE THAN (หม่องเต็ง )	checker	2026-07	14250	["crane_ops", "stock_count", "prod_check", "zone_arr"]	57	overpaid	\N	2026-07-08 13:00:11.495498+00
f13af336-f401-40a0-8906-55406bef2da2	62007	MR.KHIN MAUNG HTWE (หม่องเท)	checker	2026-07	13800	["crane_ops", "wms_entry", "prod_check", "zone_arr", "del_coord"]	64	overpaid	\N	2026-07-08 13:01:36.072399+00
b0b3abbe-7f73-4444-a1c8-7c01b186d022	66017	MR.WAI YAN (เวยาน)	checker	2026-07	12000	["crane_ops", "stock_count", "prod_check", "zone_arr", "equip_care"]	64	fair	\N	2026-07-08 13:02:36.766866+00
4988769e-13fa-4ec3-9b3d-8fb9543159fa	61071	MR.KYAW KYAW NAING (จอนาย)	checker	2026-07	12000	["crane_ops", "wms_entry", "prod_check", "zone_arr", "issue_rpt", "del_coord"]	79	fair	\N	2026-07-08 13:07:18.295462+00
\.


--
-- Data for Name: wms_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."wms_users" ("username", "password", "name", "role", "is_admin", "perms", "active", "created_at", "updated_at", "bypass_timer") FROM stdin;
66001	b5fa31b	น.ส.กุสุมา จันทะคุณ	เจ้าหน้าที่จัดส่ง	f	{logistic-plan,customers,loading-order,loading,truck-dispatch,driver-monitor,driver-analytics,production-block}	t	2026-06-18 02:33:54.082632+00	2026-08-07 04:15:07.751+00	t
68023	d9c1836d	น.ส.ณัฐิดา ดวงจันทร์	เจ้าหน้าที่จัดส่ง	f	{logistic-plan,customers,loading-order,loading,truck-dispatch,driver-monitor,driver-analytics,production-block}	t	2026-06-20 02:15:56.080123+00	2026-08-07 04:15:12.917+00	t
58035	884c2f07	น.ส.จินตนา แสนหยอด	เจ้าหน้าที่คลังสินค้า	f	{products,stock-count,kpi-stock,kpi-wh,production-block}	t	2026-06-18 02:26:49.233804+00	2026-08-07 04:15:19.8+00	f
63012	7097eb3a	นายจักรินทร์ สมบูรณ์	หัวหน้าแผนกคลังสินค้า	f	{wm-manage,products,stock-count,printtag,analytics,whactivity,kpi-stock,logistic-plan,truck-dispatch,driver-monitor,driver-analytics,kpi-wh,training,user-accounts,audit-log}	t	2026-06-18 07:20:30.64828+00	2026-06-23 07:25:56.277+00	f
p.pakkanun	9919aa9c	ภคนันท์	พงศ์พรพรต	f	{wm-manage,products,stock-count,printtag,analytics,whactivity,kpi-stock,logistic-plan,loading-order,loading,truck-dispatch,driver-monitor,driver-analytics,kpi-wh,user-accounts,audit-log}	t	2026-06-20 04:43:52.964691+00	2026-06-24 13:19:38.191+00	f
Admin26052540	776e136b	ผู้ดูแลระบบ	Administrator	t	{input,printtag,analytics,overdue,whactivity,warehouse-map,logistic-plan,truck-dispatch,kpi-wh,kpi-stock}	t	2026-06-18 02:01:15.902923+00	2026-06-18 02:01:15.813+00	t
\.


--
-- Data for Name: work_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."work_orders" ("id", "created_at", "created_by", "zone", "sku", "sku_name", "bundles", "to_zone", "reason", "due_date", "status", "assigned_to", "updated_at", "note") FROM stdin;
\.


--
-- Data for Name: zone_capacity_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."zone_capacity_log" ("id", "log_date", "zone", "empty_slots", "recorded_by", "created_at") FROM stdin;
\.


--
-- Data for Name: zone_configs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."zone_configs" ("key", "value", "updated_at") FROM stdin;
\.


--
-- Data for Name: zone_stock; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."zone_stock" ("zone", "sku", "sku_name", "pcs", "ppb", "bundle_width", "bundle_height", "updated_at") FROM stdin;
C5	0CGI30.1200	CG 3 ขาวชมพูWhite Pink	73	100	44	40	2026-06-19 04:10:21.641+00
C5	0CGI30.1400	CG 3 ขาวเหลืองWhite Yellow	283	100	44	40	2026-06-19 04:10:21.644+00
C5	0CGI3001001	CG 3 ฟ้า Blue	212	100	46	49	2026-06-19 04:10:21.644+00
C5	0CGI3001201	CG 3 ชมพู Pink	71	100	46	49	2026-06-19 04:10:21.644+00
C5	0CGI3001501	CG 3 แดงRed	219	100	46	49	2026-06-19 04:10:21.644+00
C5	0CGI3001900	CG 3 ส้มOrange	1331	100	46	49	2026-06-19 04:10:21.644+00
C5	0CGI3002101	CG 3 ม่วงPurple	139	50	46	49	2026-06-19 04:10:21.644+00
C5	0CGI4001001	CG 4 ฟ้า Blue	611	60	37	49	2026-06-19 04:10:21.644+00
C5	0CGI4001401	CG 4 เหลือง Yellow	28	60	37	49	2026-06-19 04:10:21.644+00
C5	0CGI4001600	CG 4 แดงRed	12	60	37	49	2026-06-19 04:10:21.652+00
C5	0CGI4001900	CG 4 ส้มOrange	1388	60	37	49	2026-06-19 04:10:21.652+00
C5	0CGI4002101	CG 4 ม่วงPurple	1640	60	37	49	2026-06-19 04:10:21.652+00
C5	0CGI5001900	CG 5 ม่วงPurple	381	60	46	29	2026-06-19 04:10:21.652+00
C5	0CGI5002100	CG 5 เงินSilver	30	60	46	29	2026-06-19 04:10:21.652+00
C5	0CGI6002100	CG 6 เงินSilver	4	30	53	29	2026-06-19 04:10:21.652+00
P2	0RTG20.0800	PS 2x1 ขาวเงินWhiteSilver	112	120	39	38	2026-06-19 04:10:21.652+00
P2	0RTG20.1200	PS 2x1 ขาวชมพูWhite Pink	11	120	39	38	2026-06-19 04:10:21.652+00
P2	0RTG20.1201	PS 2x1 ขาวฟ้าชมพูWhite Blue Pink	714	120	39	38	2026-06-19 04:10:21.652+00
P2	0RTG20.1400	PS 2x1 ขาวเหลือง White Yellow	4069	120	39	38	2026-06-19 04:10:21.652+00
P2	0RTG20.1600	PS 2x1 ขาวแดงWhite Red	120	120	39	38	2026-06-19 04:10:21.652+00
P2	0RTG2000800	PG 2x1 ทองเงินGold Silver	577	120	40	39	2026-06-19 04:10:21.652+00
P2	0RTG200080T	PG 2x1 ทองเงิน Gold Silver(T)	297	120	40	39	2026-06-19 04:10:21.652+00
P2	0RTG200100T	PG 2x1 ทองฟ้าGold Blue(T)	60	120	40	39	2026-06-19 04:10:21.652+00
P2	0RTG2001201	PG 2x1 ทองขาวฟ้าชมพูGold White Blue Pink	105	120	40	39	2026-06-19 04:10:21.652+00
P2	0RTG200121T	PG 2x1 ทองฟ้าชมพูGold Blue Pink(T)	102	120	40	39	2026-06-19 04:10:21.652+00
P2	0RTG200140.	PG 2x1 ทองขาวเหลืองGold White Yellow	6023	120	40	39	2026-06-19 04:10:21.652+00
P2	0RTG2001600	PG 2x1 ทองขาวแดงGold White Red	113	120	40	39	2026-06-19 04:10:21.652+00
P2	0RTG200160T	PG 2x1 ทองแดงGold Red(T)	62	120	40	39	2026-06-19 04:10:21.652+00
P2	0RTG2001900	PG 2x1 ทองขาวส้มGold White Orange	99	120	40	39	2026-06-19 04:10:21.652+00
P2	0RTG200211T	PG 2x1 ทองฟ้าม่วงGold Blue Purple(T)	782	120	40	39	2026-06-19 04:10:21.652+00
P2	0SQG15.0800	PS 1.5 ขาวเงินWhiteSilver	82	100	37	37	2026-06-19 04:10:21.652+00
P2	0SQG15.1600	PS 1.5 ขาวแดงWhite Red	70	100	37	37	2026-06-19 04:10:21.652+00
P3	0RTG2001000	PG 2x1 ทองขาวฟ้าGold White Blue	1237	120	40	39	2026-06-19 04:10:21.652+00
P3	0RTG2001200	PG 2x1 ทองขาวชมพูGold White Pink	11520	120	40	39	2026-06-19 04:10:21.652+00
P3	0RTG200120T	PG 2x1 ทองชมพูGold Pink(T)	1273	120	40	39	2026-06-19 04:10:21.652+00
P3	0SQG1500800	PG 1.5 ทองเงินGold Silver	131	100	37	37	2026-06-19 04:10:21.652+00
P3	0SQG150100T	PG 1.5 ทองฟ้าGold Blue (T)	346	100	37	37	2026-06-19 04:10:21.652+00
P3	0SQG1501201	PG 1.5 ทองขาวฟ้าชมพูGold White Blue Pink	27	100	37	37	2026-06-19 04:10:21.652+00
P3	0SQG150120T	PG 1.5 ทองชมพูGold Pink(T)	396	100	37	37	2026-06-19 04:10:21.652+00
P3	0SQG150160T	PG 1.5 ทองแดงGold Red (T)	100	100	37	37	2026-06-19 04:10:21.652+00
P3	0SQG150190T	PG 1.5 ทองส้มGold Orange(T)	50	100	37	37	2026-06-19 04:10:21.652+00
P3	0SQG150210T	PG 1.5 ทองม่วง Gold Purple(T)	47	100	37	37	2026-06-19 04:10:21.652+00
P3	0SQG150211T	PG 1.5 ทองฟ้าม่วงGold Blue Purple (T)	69	100	37	37	2026-06-19 04:10:21.652+00
P1	0RTG300120T	PG 3x1.5 ทองชมพูGold Pink(T)	930	50	39	40	2026-06-19 04:10:21.652+00
P1	0RTG300190T	PG 3x1.5 ทองส้มGold Orange (T)	12	50	39	40	2026-06-19 04:10:21.652+00
P1	0RTG300211T	PG 3x1.5 ทองฟ้าม่วงGold Blue Purple (T)	347	50	39	40	2026-06-19 04:10:21.652+00
P1	0SQG200120T	PG 2x2 ทองชมพูGoldPink(T)	39	64	42	42	2026-06-19 04:10:21.652+00
P1	0SQG200140T	PG 2x2 ทองเหลืองGold Yellow(T)	10	64	42	42	2026-06-19 04:10:21.652+00
P1	0SQG200160T	PG 2x2 ทองแดงGold Red(T)	93	64	42	42	2026-06-19 04:10:21.652+00
P1	0SQG2001900	PG 2x2 ทองขาวส้มGold White Orange	13	64	42	42	2026-06-19 04:10:21.652+00
P1	0SQG200190T	PG 2x2 ทองส้มGold Orange (T)	9	64	42	42	2026-06-19 04:10:21.652+00
P1	0SQG2002100	PG 2x2 ทองม่วงGold White Purple	256	64	42	42	2026-06-19 04:10:21.652+00
P1	0SQG2002101	PG 2x2 ทองขาวฟ้าม่วงGold White Blue Purple	990	64	42	42	2026-06-19 04:10:21.652+00
P1	0SQG200211T	PG 2x2 ทองฟ้าม่วงGold Blue Purple (T)	120	64	42	42	2026-06-19 04:10:21.652+00
P4	0RTG40.1000	PS 4x2 ขาวฟ้าWhite Blue	40	40	49	38	2026-06-19 04:10:21.652+00
P4	0RTG40.1200	PS 4x2 ขาวชมพูWhite Pink	80	40	49	38	2026-06-19 04:10:21.652+00
P4	0RTG40.1201	PS 4x2 ขาวฟ้าชมพูWhite Blue Pink	19	40	49	38	2026-06-19 04:10:21.652+00
P4	0RTG40.1400	PS 4x2 ขาวเหลือง White Yellow	80	40	49	38	2026-06-19 04:10:21.652+00
P4	0RTG40.1900	PS 4x2 ขาวส้มWhite Orange	29	40	49	38	2026-06-19 04:10:21.652+00
P4	0RTG400160T	PG 4x2 ทองแดงGold Red(T)	18	40	49	42	2026-06-19 04:10:21.652+00
P4	0RTG400211T	PG 4x2 ทองฟ้าม่วงGold Blue Purple(T)	7	40	49	42	2026-06-19 04:10:21.652+00
P4	0RTG6001900	PG 6x2 ทองขาวส้มGold White Orange	8	24	45	39	2026-06-19 04:10:21.652+00
P4	0RTG6002101	PG 6x2 ทองขาวม่วงGold White Purple	14	24	45	39	2026-06-19 04:10:21.652+00
P4	0SQG300190T	PG 3x3 ทองส้มGold Orange(T)	5	36	45	45	2026-06-19 04:10:21.652+00
P4	0SQG4001200	PG 4x4 ทองขาวชมพูGoldWhitePink	6	25	49.5	49.5	2026-06-19 04:10:21.652+00
P4	0SQG4001400	PG 4x4 ทองขาวเหลืองGold White Yellow	75	25	49.5	49.5	2026-06-19 04:10:21.652+00
P4	0SQG400190T	PG 4x4 ทองส้มGold Orange(T)	8	25	49.5	49.5	2026-06-19 04:10:21.652+00
C4	0SQG3001400	PG 3x3 ทองขาวเหลืองGold White Yellow	1872	36	45	45	2026-06-19 04:10:21.652+00
C4	0RTG4001200	PG 4x2 ทองขาวชมพูGold White Pink	120	40	49	42	2026-06-19 04:10:21.652+00
C4	0SQG300211T	PG 3x3 ทองฟ้าม่วงGold Blue Purple(T)	684	36	45	45	2026-06-19 04:10:21.652+00
C4	0RTG4001201	PG 4x2 ทองขาวฟ้าชมพูGold White Blue Pink	600	40	49	42	2026-06-19 04:10:21.652+00
C4	0RTG40.1600	PS 4x2 ขาวแดงWhite Red	520	40	49	38	2026-06-19 04:10:21.652+00
C4	0SQG4001900	PG 4x4 ทองขาวส้มGold White Orange	400	25	49.5	49.5	2026-06-19 04:10:21.652+00
C4	0RTG6001900	PG 6x2 ทองขาวส้มGold White Orange	360	24	45	39	2026-06-19 04:10:21.652+00
C4	0RTG400160T	PG 4x2 ทองแดงGold Red(T)	280	40	49	42	2026-06-19 04:10:21.652+00
C4	0SQG4002101	PG 4x4 ทองขาวฟ้าม่วงGold White Blue Purple	250	25	49.5	49.5	2026-06-19 04:10:21.652+00
C4	0RTG400190T	PG 4x2 ทองส้มGold Orange(T)	160	40	49	42	2026-06-19 04:10:21.652+00
C4	0RTG6002101	PG 6x2 ทองขาวม่วงGold White Purple	216	24	45	39	2026-06-19 04:10:21.652+00
C4	0RTG400140T	PG 4x2 ทองเหลืองGold Yellow(T)	160	40	49	42	2026-06-19 04:10:21.652+00
C4	0SQG4001200	PG 4x4 ทองขาวชมพูGoldWhitePink	100	25	49.5	49.5	2026-06-19 04:10:21.652+00
C4	0RTG6001400	PG 6x2 ทองขาวเหลืองGold White Yellow	144	24	45	39	2026-06-19 04:10:21.652+00
C4	0SQG4001600	PG 4x4 ทองขาวแดงGold White Red	2125	25	49.5	49.5	2026-06-19 04:10:21.652+00
C4	0RTG6001600	PG 6x2 ทองขาวแดงGold White Red	360	24	45	39	2026-06-19 04:10:21.652+00
C4	0SQG4001400	PG 4x4 ทองขาวเหลืองGold White Yellow	100	25	49.5	49.5	2026-06-19 04:10:21.652+00
RE-C5	0CGI4001201	CG 4 ชมพู Pink	3780	60	37	49	2026-06-19 04:10:21.652+00
RE-C5	0CGI5002100	CG 5 เงินSilver	600	60	46	29	2026-06-19 04:10:21.652+00
RE-C5	0CGI3001900	CG 3 ส้มOrange	800	100	46	49	2026-06-19 04:10:21.652+00
RE-C5	0CGI6001900	CG 6 ม่วงPurple	510	30	53	29	2026-06-19 04:10:21.652+00
RE-C5	0RTG200121T	PG 2x1 ทองฟ้าชมพูGold Blue Pink(T)	1200	120	40	39	2026-06-19 04:10:21.652+00
RE-C5	0CGI30.1000	CG 3 ขาวฟ้าWhite Blue	2400	100	44	40	2026-06-19 04:10:21.652+00
RE-C5	0CGI30.1200	CG 3 ขาวชมพูWhite Pink	200	100	44	40	2026-06-19 04:10:21.652+00
RE-C5	0SQG2001000	PG 2x2 ทองขาวฟ้าGold White Blue	1600	64	42	42	2026-06-19 04:10:21.652+00
RE-C5	0SQG200100T	PG 2x2 ทองฟ้าGold Blue(T)	1984	64	42	42	2026-06-19 04:10:21.656+00
RE-C5	0RTG4001400	PG 4x2 ทองขาวเหลืองGold White Yellow	1920	40	49	42	2026-06-19 04:10:21.657+00
RE1	0SQG1501900	PG 1.5 ทองขาวส้มGold White Orange	1400	100	37	37	2026-06-19 04:10:21.657+00
RE1	0SQG1502100	PG 1.5 ทองขาวม่วงGold White Purple	800	100	37	37	2026-06-19 04:10:21.657+00
RE1	0SQG150121T	PG 1.5 ทองฟ้าชมพูGold Blue Pink(T)	2000	100	37	37	2026-06-19 04:10:21.657+00
RE1	0SQG150190T	PG 1.5 ทองส้มGold Orange(T)	1200	100	37	37	2026-06-19 04:10:21.657+00
RE1	0RTG2001900	PG 2x1 ทองขาวส้มGold White Orange	1080	120	40	39	2026-06-19 04:10:21.657+00
RE1	0SQG1501600	PG 1.5 ทองขาวแดงGold White Red	400	100	37	37	2026-06-19 04:10:21.657+00
RE1	0SQG150210T	PG 1.5 ทองม่วง Gold Purple(T)	300	100	37	37	2026-06-19 04:10:21.657+00
RE4	0SQG400210T	PG 4x4 ทองฟ้าม่วงGold Blue Purple(T)	350	25	49.5	49.5	2026-06-19 04:10:21.657+00
RE4	0SQG400160T	PG 4x4 ทองแดงGold Red (T)	350	25	49.5	49.5	2026-06-19 04:10:21.657+00
RE4	0RTG400120T	PG 4x2 ทองชมพูGold Pink(T)	960	40	49	42	2026-06-19 04:10:21.657+00
\.


--
-- Name: zone_capacity_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."zone_capacity_log_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict t1LKMewSFJMRP4IBeEfo0OO1RuvCnywIvW7Ay9L7QG3B61gU3el0Sdo0HE7ogDp

