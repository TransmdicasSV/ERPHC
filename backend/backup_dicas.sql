--
-- PostgreSQL database dump
--

\restrict Ldpnp0inLeaiXWpmacySrJMRFYgJGsgQLOdZDDV3Ih3xL4oFfb3Y4TTcd2xaqQf

-- Dumped from database version 18.4
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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: entregas_ti; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entregas_ti (
    id integer NOT NULL,
    fecha date,
    encargado character varying(100),
    nombre character varying(200),
    dni character varying(20),
    cargo character varying(100),
    operacion character varying(100),
    condicion character varying(50),
    equipo_tipo character varying(100),
    marca character varying(100),
    modelo character varying(100),
    serie character varying(100),
    laptop character varying(100),
    mouse character varying(100),
    cargador character varying(100),
    motivo character varying(200),
    observaciones text,
    precio numeric(10,2)
);


ALTER TABLE public.entregas_ti OWNER TO postgres;

--
-- Name: entregas_ti_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.entregas_ti_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.entregas_ti_id_seq OWNER TO postgres;

--
-- Name: entregas_ti_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.entregas_ti_id_seq OWNED BY public.entregas_ti.id;


--
-- Name: equipos_flota; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipos_flota (
    placa character varying NOT NULL,
    programa character varying,
    fecha character varying,
    hora character varying,
    tablet character varying,
    radio character varying,
    camaras character varying,
    img_tablet character varying,
    img_radio character varying,
    img_camaras character varying
);


ALTER TABLE public.equipos_flota OWNER TO postgres;

--
-- Name: incidentes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incidentes (
    id integer NOT NULL,
    placa character varying,
    operacion character varying,
    fecha_solicitud character varying,
    hora_inicio character varying,
    hora_fin character varying,
    url_grabacion character varying,
    fecha_ingreso character varying,
    estado character varying
);


ALTER TABLE public.incidentes OWNER TO postgres;

--
-- Name: incidentes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.incidentes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.incidentes_id_seq OWNER TO postgres;

--
-- Name: incidentes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.incidentes_id_seq OWNED BY public.incidentes.id;


--
-- Name: incidentes_soporte; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incidentes_soporte (
    id integer NOT NULL,
    placa character varying(20) NOT NULL,
    tipo_solicitud character varying(100) NOT NULL,
    descripcion text NOT NULL,
    operador character varying(100) NOT NULL,
    estado character varying(20) DEFAULT 'Pendiente'::character varying,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.incidentes_soporte OWNER TO postgres;

--
-- Name: incidentes_soporte_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.incidentes_soporte_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.incidentes_soporte_id_seq OWNER TO postgres;

--
-- Name: incidentes_soporte_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.incidentes_soporte_id_seq OWNED BY public.incidentes_soporte.id;


--
-- Name: inspecciones_flota; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inspecciones_flota (
    id integer NOT NULL,
    placa character varying(20),
    fecha character varying(20),
    hora character varying(20),
    tablet character varying(50),
    radio character varying(50),
    camaras character varying(50),
    img_tablet text,
    img_radio text,
    img_camaras text,
    observaciones text
);


ALTER TABLE public.inspecciones_flota OWNER TO postgres;

--
-- Name: inspecciones_flota_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inspecciones_flota_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inspecciones_flota_id_seq OWNER TO postgres;

--
-- Name: inspecciones_flota_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inspecciones_flota_id_seq OWNED BY public.inspecciones_flota.id;


--
-- Name: mantenimientos_tecnicos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mantenimientos_tecnicos (
    id integer NOT NULL,
    placa character varying(50),
    fecha_ejecutada date,
    frecuencia_dias integer DEFAULT 30,
    dvr character varying(50),
    copiloto character varying(50),
    radio_base character varying(50),
    handy character varying(50),
    camara_interna character varying(50),
    camara_externa character varying(50),
    camara_retroceso character varying(50),
    sensores_retroceso character varying(50),
    sensores_delanteros character varying(50),
    sistema_adas character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.mantenimientos_tecnicos OWNER TO postgres;

--
-- Name: mantenimientos_tecnicos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mantenimientos_tecnicos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mantenimientos_tecnicos_id_seq OWNER TO postgres;

--
-- Name: mantenimientos_tecnicos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mantenimientos_tecnicos_id_seq OWNED BY public.mantenimientos_tecnicos.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    rol character varying(20) DEFAULT 'auditor'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: vehiculos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehiculos (
    placa character varying(20) NOT NULL,
    programa character varying(50),
    tipo_vehiculo character varying(100),
    marca_tracto character varying(100),
    modelo_tracto character varying(100),
    anio_fabricacion character varying(20),
    operacion character varying(100),
    cliente character varying(100)
);


ALTER TABLE public.vehiculos OWNER TO postgres;

--
-- Name: entregas_ti id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entregas_ti ALTER COLUMN id SET DEFAULT nextval('public.entregas_ti_id_seq'::regclass);


--
-- Name: incidentes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidentes ALTER COLUMN id SET DEFAULT nextval('public.incidentes_id_seq'::regclass);


--
-- Name: incidentes_soporte id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidentes_soporte ALTER COLUMN id SET DEFAULT nextval('public.incidentes_soporte_id_seq'::regclass);


--
-- Name: inspecciones_flota id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inspecciones_flota ALTER COLUMN id SET DEFAULT nextval('public.inspecciones_flota_id_seq'::regclass);


--
-- Name: mantenimientos_tecnicos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mantenimientos_tecnicos ALTER COLUMN id SET DEFAULT nextval('public.mantenimientos_tecnicos_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Data for Name: entregas_ti; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entregas_ti (id, fecha, encargado, nombre, dni, cargo, operacion, condicion, equipo_tipo, marca, modelo, serie, laptop, mouse, cargador, motivo, observaciones, precio) FROM stdin;
1	2026-06-09	Ronnie	CASTRO HUAMANI TONY EDIL	42855046	CONDUCTOR	BAMBAS	NUEVO	XIAOMI SMART BAND 9	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G6N901198			C			\N
4	2026-05-25	Ronnie	TICONA FERNANDEZ LIWER RUBEN	42427909	CONDUCTOR CISTERNA		NUEVO	XIAOMI SMART BAND 9	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5GN502126			C			\N
5	2026-05-19	Ronnie	FAVIO COLQUEHUANCA USEDO	44530184	CONDUCTOR CISTERNA	LAS BAMBAS	NUEVO	XIAOMI SMART BAND 9	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G6N502163			C			\N
6	2026-05-18	Ronnie	GONZALES TURPO LUIS	41596373	CONDUCTOR CISTERNA	LAS BAMBAS	NUEVO	XIAOMI SMART BAND 9	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G6N402322			C			\N
8	2026-05-14	Juan	QUISPE PEREZ BELIZARIO	45477133	CONDUCTOR		NUEVO	XIAOMI SMART BAND 9	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G6N4023303	-	-	C			\N
9	2026-05-14	Juan	QUISPE YTO WILSON DAVID	42772987	CONDUCTOR		NUEVO	XIAOMI SMART BAND 9	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAAG5RW01988	-	-	C			\N
10	2026-05-08	Juan	CHOQUE CENTENO, SANTOS BONIFACIO	21173927	CONDUCTOR	GLP	NUEVO	XIAOMI SMART BAND 9	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5RW03508	-	-	C			\N
11	2026-05-06	Juan	SALAMANCA ARUHUANCA EDWIN	44463501	CONDUCTOR		USADO	XIAOMI SMART BAND 9	XIAOMI	SMART BAND 9 ACTIVE		-	-	C			\N
12	2026-04-29	Juan	GILBERT FLORES MAMANI	43303659	CONDUCTOR		USADO	XIAOMI SMART BAND 8	XIAOMI	SMART BAND 8	46718/CRAG503WU02906	-	-	C			\N
13	2026-04-27	Juan	COLQUEHUANCA QUISPE, PEDRO WALTER	43313086	CONDUCTOR		NUEVO	XIAOMI SMART BAND 9	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAAG5QV00651	-	-	C			\N
14	2026-04-27	Ronnie	DENIS MARTIN MERINO QUISPE	76642022	Asistente de Almacen 	LOGISTICA	USADO	HP LAPTOP	HP	HP LAPTOP 15-ef2xxx	5CD423FBD8	-		C			\N
15	2026-04-27	Juan	NINASIVINCHA PRADO, KENYO MICHAEL	46787132	CONDUCTOR		NUEVO	XIAOMI SMART BAND 9	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAAG4YJ17946	-	-	C			\N
16	2026-04-25	Juan	MARCO CHOQUEHUANCA CALACHUA	42154545	CONDUCTOR	Las Bambas	NUEVO	XIAOMI SMART BAND 9	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5GRW02853	-	-	C			\N
17	2026-04-23	Ricardo	COAGUILA LAYME, CESAR EMILIO	30676168	CONDUCTOR		NUEVO	XIAOMI SMART BAND 9	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5GAXM04690	-	-	C			\N
18	2026-03-25	Ricardo	Marquez Llanque Jose Fabian 	72247518	Asistente de Almacen 	Almacen-Compras	USADO	Laptop HP AMD Ryzen 5 5500u	HP	AMD Ryzen 5 500U whit Radean Graphics 	5CD423FBCN	C	C	C			\N
19	2026-03-25	Ricardo	Conde Salas Diego Felix	71210986	Asistente de Almacen 	Logistica	USADO	Laptop HP AMD Ryzen 5 5500u	HP	AMD Ryzen 5 500U whit Radean Graphics 	5CD423FBCN	C					\N
20	2026-03-12	Ricardo	Ticona Fernandez Liwer Ruben	42427909	Conductor de Cisterna de Combustible	Constancia	USADO	Smart Band	Xiaomi	9 Active	-	-	-	C		46093	115.00
21	2026-03-05	Ricardo	Luis Inocencio Turpo Gonzales		Conductor de Cisterna	Bambas	NUEVO	Smart Band	Xiaomi	9 Active	59885/ATAA5G5RW03408	-	C	C		46086	115.00
22	2026-03-04	Ricardo	Halanoca Sarmiento Mayra	76419179	Planner de Mantenimiento	Mantenimiento - ADM	NUEVO	Mouse Logitech M90	LOGITECH	M90	2409AP03M2H9		C				\N
23	2026-03-04	Ricardo	Albarracin Alarcon Anthony Gabriel 	62649460	Auxiliar de HSE 	HSE	NUEVO	Mouse Logitech M90	LOGITECH	M90	2408AP084039		C				\N
24	2026-03-03	Ricardo	Bellido Turpo Jordan	71864686	Conductor de Cisterna de GLP	Operaciones	USADO	Smart Band	Xiaomi	Band 9 Active	-	-	C	C		46084	115.00
25	2026-02-25	Ricardo	Pacori Vilca Luis Alberto	45214966	Conductor de Semitrailer	Cargas Diversas / Industrias San José	NUEVO	Mi Band 9 active	Xiaomi	Mi Band 9 Active	59885/ATAA5G4XJ05150	-	-	C		46078	115.00
26	2026-02-24	Ricardo	Vilchez Quesada Jose Luis		Administrativo	Inspector	USADO	Laptop Dell 	Dell 	Intel Core I3-7020U	00331-10000-00001-AA186	C	C	C			\N
27	2026-02-24	Ricardo	Indira Gutierrez Chaiña	72104188	Analista Costos y Presupuestos	Administración	NUEVO	Laptop Lenovo ThinkPad	Lenovo	ThinkPad	103486747749	C	-	C		46074	1250.00
28	2026-02-21	Ricardo	Canal Mendoza Alejandro Ruben		Administrativo	Mantenimiento	NUEVO	Cargador Lenovo 	Lenovo	ADLX45NCC3A	577C65DLMF0819						\N
29	2026-02-21	Ricardo	Vega Peña Pedro Ruiz		Administrativo	Mantenimiento	NUEVO	Cargador Lenovo 	Lenovo	ADLX45NCC3A	577C65DLMF0819			C			\N
30	2026-02-19	Ricardo	Puma Chilo Jesus	74873410	Monitor de GPS	HSE	USADO	Laptop	Lenovo	LNVNB161216	LNVNB161216	C	C	C		46072	\N
31	2026-02-19	Ricardo	Curse Vera Anyela Daniela	72798180	Asistente de Operaciones	Operaciones	USADO	Laptop	HP	CND0461FK7	CND0461FK7	C	C	C		46072	\N
32	2026-02-19	Ricardo	Paucar Romero Nein Davis	47315424	Supervisor de Operaciones Repsol	Mantenimiento	NUEVO	Laptop Lenovo ThinkPad	Lenovo	ThinkPad	103502749807	C	-	C		46077	1250.00
33	2026-02-13	Ricardo	EDWIN CUTIPA PAREDES	29686214	OPERADOR	INDUSTRIA	USADO	XIAOMI SMART BAND 9	XIAOMI	SMART BAND 9 ACTIVE	-	-	-	C			115.00
34	2026-02-13	Ricardo	WILSON AHUATE DURAN	47782734	OPERADOR	INDUSTRIA	NUEVO	XIAOMI SMART BAND 9	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G4XJ04879	- 	-	C			115.00
35	2026-02-13	Ricardo	Quihue Llaza Luis Ángel	47129297	Conductor de Semitrailer	Cargas Diversas/Industrias	NUEVO	XIAOMI Smart Band 9 active	Xiaomi	Band 9 Active	59885/ATAA5G4XJ61161	C	-	C		46066	115.00
36	2026-02-12	Jack	CONCHA ESPIRILLA MAURO	43191636	OPERADOR	BAMBAS	NUEVO	XIAOMI SMART BAND 9 ACTIVE	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G4XJ04580	-	-	C			115.00
37	2026-02-11	Ricardo	Rodríguez Mayorga Edwin Fernando	61310117	Asistente de HSE		NUEVO	Portable Storage 2TB	Toshiba	Canvio Basics	Z53DZ0THVFH	C	-	C		46064	250.00
38	2026-02-11	Ricardo	Jhon Soto Sisa	48165313	Conductor de Cisterna	Las Bambas	NUEVO	Smart Band	Xiaomi	Band 9 Active	59885/ATAA5G4XJ05103	C	-	C		46064	115.00
39	2026-02-06	Ricardo	GOYTENDIA FUENTES JOSE LUIS	45647381	OPERADOR	INDUSTRIA	NUEVO	XIAOMI SMART BAND 9 ACTIVE	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G4XJ05174	-	-	C			115.00
40	2026-02-05	Jack	RAMOS CALDERON ALCIDES	56950306	OPERADOR	GLP	NUEVO	XIAOMI SMART BAND 9 ACTIVE	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G4XJ05234	-	-	C			115.00
41	2026-02-04	Ricardo	Meza Huilca Damaso	29725073	Conductor de Cisterna GLP		NUEVO	Smart Band	Xiaomi	Smart Band 9	59885/ATAA5G4XJ05228	C	-	C		46057	115.00
42	2026-02-03	Ricardo	ILACHOQUE SONCCO JAIME JESUS	40974420	OPERADOR	BAMBAS	USADO	XIAOMI SMART BAND 9	XIAOMI	SMART BAND 9	55453/DYAMJQ4UW00599	-	-	C			115.00
3	2026-05-26	Ronnie	PACHERRES GALVEZ WILMER	29694814	SUPERVISOR DE ESCOLTA	LAS BAMBAS	NUEVO	XIAOMI SMART BAND 9	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5GN502184			C			\N
7	2026-05-15	Juan	ANCO FLORES	43759945	CONDUCTOR		USADO	MI SMART BAND 6	XIAOMI	MI SMART BAND 6	-----	-	-	C		Se le entrega equipo usuado	\N
43	2026-02-03	Ricardo	ACOSTA ACOSTA JULIO CESAR	71584070	AMINISTRATIVO	BAMBAS	NUEVO	PROFESSIONAL LASER MEASURE	BOSH	GML 40	42228DIONICIA					Asignado meses \r\nFebrero/Marzo/Agosto/Setiembre	\N
44	2026-02-03	Jack	MERMA CRUZ ARTURO	43432458	OPERADOR	BAMBAS	USADO	 	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G4YJ16621	-	-	C			115.00
45	2026-01-28	Ricardo	MANRIQUE CASTRO JOSE MANUEL	29708919	OPERADOR	INDUSTRIA	USADO	XIAOMI SMART BAND 8	XIAOMI	SMART BAND 8	46719/CRAG503UT12639	-	-	C			\N
46	2026-01-26	Jack	ATAHUAMAN ESTRELLA WALTER OLMER	44059942	OPERADOR	BAMBAS	NUEVO	XIAOMI SMART BAND 9 ACTIVE	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G4XJ05179	-	-	C			115.00
47	2026-01-26	Jack	MAMANI BAUTISTA DARIO BASILIO	18687796	OPERADOR	INDUSTRIA	USADO	XIAOMI SMART BAND 9 	XIAOMI	SMART BAND 9	554556/DYAMJQ4U800108	-	-	C			115.00
48	2026-01-25	Jack	CUTIRE ALVAREZ EDGAR LEONARDO	44057416	OPERADOR	BAMBAS	NUEVO	XIAOMI SMART BAND 9 ACTIVE	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G4XJ05285	-	-	C			115.00
49	2026-01-23	Jack	CASTRO VILLALOBOS JOSE LUIS	41760308	OPERADOR	BAMBAS	NUEVO	XIAOMI SMART BAND 9 ACTIVE	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G4XJ05202	-	-	C			115.00
50	2026-01-21	Jack	MERMA MASCA RONALD EDWIN	76006078	OPERADOR	INDUSTRIA	NUEVO	XIAOMI SMART BAND 9 ACTIVE	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G4XJ05207	-	-	C			115.00
51	2026-01-20	Jack	BAUTISTA ESTRADA WILDER	44059942	OPERADOR	INDUSTRIA	NUEVO	XIAOMI SMART BAND 9 ACTIVE	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G4XJ05157	-	-	C			115.00
52	2026-01-20	Jack	ANAMPA NEYRA CARLOS RAFAEL	40627124	OPERADOR	GLP	NUEVO	XIAOMI SMART BAND 9 ACTIVE	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G4XJ05169	-	-	C			115.00
53	2026-01-19	Jack	FLORES MAMANI CARMELO JULIO	44311744	OPERADOR	CONSTANCIA	NUEVO	XIAOMI SMART BAND 9 ACTIVE	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G4XJ05268	-	-	C			115.00
54	2026-01-19	Jack	USTUA QUILLAHUAMAN FLAVIO	45227727	OPERADOR	BAMBAS	NUEVO	XIAOMI SMART BAND 9 ACTIVE	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G4XJ05124	-	-	C			115.00
55	2026-02-12	Jack	QUISPE CONDORI DAVID WALTER	44659117	OPERADOR	INDUSTRIA	NUEVO	XIAOMI SMART BAND 9 ACTIVE	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G4CJ04935	-	-	C			115.00
56	2026-02-17	Jack	FLORES FLORES CARLOS	47782734	OPERADOR	BAMBAS	USADO	XIAOMI SMART BAND 7	XIAOMI	SMART BAND 7		-	-	C			115.00
57	2026-03-11	Jack	JARA HUARACALLO DANTE BLADIMIR	72191931	OPERADOR	INDUSTRIA	NUEVO	XIAOMI SMART BAND 9 ACTIVE	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G5UH02129	-	-	C			115.00
58	2026-03-12	Jack	MAMANI CONDORI JUAN CARLOS	72148770	OPERADOR	INDUSTRIA	NUEVO	XIAOMI SMART BAND 9 ACTIVE	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G5RW01699	-	-	C			115.00
59	2026-03-13	Jack	TITTO QUITO SIMEON	29470446	OPERADOR	INDUSTRIA	NUEVO	XIAOMI SMART BAND 9 ACTIVE	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G5UH00469	-	-	C			115.00
60	2026-03-13	Jack	VILLAVICENCIO VALDIVIA JORGE GERARDO	30675178	OPERADOR	INDUSTRIA	NUEVO	XIAOMI SMART BAND 9 ACTIVE	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G4YK04923	-	-	C			115.00
61	2026-03-17	Jack	SANTOS ALVARADO ROMULO	42783049	OPERADOR	BAMBAS	NUEVO	XIAOMI SMART BAND 9 ACTIVE	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G4XH17077	-	-	C			115.00
62	2026-03-05	Jack	CASANI UCHANI SANDRO RENZO	45327135	OPERADOR	CARGAS DIVERSAS	NUEVO	XIAOMI SMART BAND 9 ACTIVE	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G5RW03569	-	-	C			115.00
63	2025-12-16	Jack	ROZAS VALVERDE ALAN JAIME	43357290	OPERADOR	BAMBAS	NUEVO	XIAOMI SMART BAND 9 ACTIVE	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G5QV01366	-	-	C			115.00
64	2026-03-19	Jack	IQUIAPAZA RUELAS JUSTO	41736595	OPERADOR	PRIMAX	NUEVO	XIAOMI SMART BAND 9 ACTIVE	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G5UF06220						\N
65	\N		AHUATE DURAN WILSON	47782734	CONDUCTOR DE SEMITRAILER	CARGAS DIVERSAS/INDUSTRIAS SAN JOSE											\N
66	\N		LAURENCIO MAMANI JACK CARLOS ENRIQUE	74888967	ASISTENTE DE TI	HSE											\N
67	\N		CANAL MENDOZA ALEJANDRO RUBEN	73172561	ASISTENTE DE MANTENIMIENTO	MANTENIMIENTO - ADM											\N
68	\N		VILCHEZ QUEZADA JOSE LUIS	43283957	INSPECTOR DE CAMPO	HSE											\N
69	\N		VILLALBA HUMIRE, SOPHIA STEFANY	73181163	AUXILIAR DE MANTENIMIENTO	MANTENIMIENTO - ADM											\N
70	\N		VEGA PEÑA, PEDRO LUIS	45140253	SUPERVISOR DE NEUMATICOS	MANTENIMIENTO - ADM											\N
71	\N		SOTOMAYOR MAQUE, WALTER	40522977	CONDUCTOR DE CISTERNA DE COMBUSTIBLE	CONSTANCIA											\N
72	\N		CONDORI CCORIMANYA, PERCY	44694666	JEFE DE MANTENIMIENTO	MANTENIMIENTO - ADM											\N
2	2026-06-03	Ronnie	MERMA MASCA RONALD EDWIN	76006078	CONDUCTOR	INDUSTRIA	NUEVO	XIAOMI SMART BAND 8	XIAOMI	SMART BAND 9 ACTIVE	59885/ATAA5G6N02197			C	PERDIDA	El conductor reporta la perdida de su pulsera se le realiza el descuento respectivo.	\N
76	2026-06-10	RONNIE CATUNTA	WILFREDO CHOQUEMALLCO MAMANI	40459697	CONDUCTOR	BAMBAS	NUEVO	XIAOMI SMART BAND 9	XIAOMI	XIAOMI SMART BAND 9	59885/ATAA5G6N901185			59885/ATAA5G6N901185	Cambio de pulsera 	Se cambia la pulsera por que  descarga rápido rapido su mi band 8 se le camnia por una mi band 9	\N
75	2026-06-10	RONNIE CATUNTA	BELLIDO TURPO, JORDAN	71864686	CONDUCTOR	DIVERSAS	NUEVO	XIAOMI SMART BAND 9	XIAOMI	XIAOMI SMART BAND 9	59885/ATAA5G6N901445			59885/ATAA5G6N901445	Perdida de pulsera	Perdida de pulsera se le aplica el descuento de S/90 	90.00
\.


--
-- Data for Name: equipos_flota; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.equipos_flota (placa, programa, fecha, hora, tablet, radio, camaras, img_tablet, img_radio, img_camaras) FROM stdin;
V8A-794	Primax	12/05/2026	10:21	ok	ok	ok	C:/Users/nanie/Desktop/dicas/22-05-2026/WhatsApp Image 2026-05-23 at 10.23.54 AM (1).jpeg	C:/Users/nanie/Desktop/dicas/22-05-2026/WhatsApp Image 2026-05-23 at 10.23.54 AM.jpeg	C:/Users/nanie/Desktop/dicas/22-05-2026/WhatsApp Image 2026-05-23 at 10.23.54 AM (2).jpeg
V9V-856	Primax	21/05/2026	16:17	ok	ok	ok	C:/Users/nanie/Desktop/dicas/22-05-2026/WhatsApp Image 2026-05-22 at 6.05.05 PM (1).jpeg	C:/Users/nanie/Desktop/dicas/22-05-2026/WhatsApp Image 2026-05-22 at 6.05.06 PM (1).jpeg	C:/Users/nanie/Desktop/dicas/22-05-2026/WhatsApp Image 2026-05-22 at 6.05.06 PM.jpeg
VAM-800	Primax	22/05/2026	10:39	missing	ok	ok	\N	\N	\N
VBU-712	Primax	12/05/2026	08:38	ok	missing	missing	C:/Users/nanie/Desktop/dicas/22-05-2026/WhatsApp Image 2026-05-23 at 10.23.54 AM (4).jpeg		
VBX-798	Primax	21/05/2026	15:22	ok	ok	missing	C:/Users/nanie/Desktop/dicas/22-05-2026/WhatsApp Image 2026-05-22 at 6.05.07 PM.jpeg	C:/Users/nanie/Desktop/dicas/22-05-2026/WhatsApp Image 2026-05-22 at 6.05.08 PM.jpeg	
VBY-760	Primax	20/05/2026	15:43	ok	missing	ok	C:/Users/nanie/Desktop/dicas/22-05-2026/WhatsApp Image 2026-05-22 at 6.05.09 PM.jpeg		C:/Users/nanie/Desktop/dicas/22-05-2026/WhatsApp Image 2026-05-22 at 6.05.08 PM (1).jpeg
VBY-798	Primax	22/05/2026	10:35	ok	ok	ok	C:/Users/nanie/Desktop/dicas/22-05-2026/WhatsApp Image 2026-05-22 at 10.11.41 PM (2).jpeg	C:/Users/nanie/Desktop/dicas/22-05-2026/WhatsApp Image 2026-05-22 at 10.11.41 PM (5).jpeg	C:/Users/nanie/Desktop/dicas/22-05-2026/WhatsApp Image 2026-05-22 at 10.11.40 PM.jpeg
VBY-814	Primax	22/05/2026	10:31	error	ok	ok	\N	\N	\N
VBY-830	Primax	22/05/2026	10:39	ok	ok	missing	C:/Users/nanie/Desktop/dicas/22-05-2026/WhatsApp Image 2026-05-22 at 10.11.41 PM (1).jpeg	C:/Users/nanie/Desktop/dicas/22-05-2026/WhatsApp Image 2026-05-22 at 10.11.41 PM.jpeg	
VBY-926	Primax	22/05/2026	10:41	ok	ok	missing	C:/Users/nanie/Desktop/dicas/26-05-2026/2.jpg	C:/Users/nanie/Desktop/dicas/22-05-2026/WhatsApp Image 2026-05-22 at 10.11.40 PM (2).jpeg	
VEW-740	Primax	22/05/2026	09:00	ok	ok	ok	C:/Users/nanie/Desktop/dicas/22-05-2026/WhatsApp Image 2026-05-22 at 10.11.42 PM.jpeg	C:/Users/nanie/Desktop/dicas/22-05-2026/WhatsApp Image 2026-05-22 at 10.11.41 PM (5).jpeg	C:/Users/nanie/Desktop/dicas/22-05-2026/WhatsApp Image 2026-05-22 at 10.11.41 PM (4).jpeg
VBU-716	Primax	--/--/----	--:--	missing	missing	missing			
VBU-717	Primax	--/--/----	--:--	missing	missing	missing	\N	\N	\N
VBU-733	Primax	--/--/----	--:--	missing	missing	missing	\N	\N	\N
VBU-736	Primax	26/05/2026	09:27	ok	ok	ok	C:/Users/nanie/Desktop/dicas/26-05-2026/photo_2026-05-26_11-00-53.jpg	C:/Users/nanie/Desktop/dicas/26-05-2026/photo_2026-05-26_11-00-27.jpg	C:/Users/nanie/Desktop/dicas/26-05-2026/camaras.jpg
VBU-752	Primax	--/--/----	--:--	missing	missing	missing	\N	\N	\N
VBU-754	Primax	26/05/2026	09:40	ok	ok	ok	C:/Users/nanie/Desktop/dicas/26-05-2026/photo_2026-05-26_11-00-57.jpg	C:/Users/nanie/Desktop/dicas/26-05-2026/photo_2026-05-26_11-00-54.jpg	C:/Users/nanie/Desktop/dicas/26-05-2026/photo_2026-05-26_11-00-55.jpg
VBU-765	Primax	--/--/----	--:--	missing	missing	missing	\N	\N	\N
VBY-773	Primax	--/--/----	--:--	missing	missing	missing	\N	\N	\N
VBY-850	Primax	--/--/----	--:--	missing	missing	missing	\N	\N	\N
VBY-886	Primax	--/--/----	--:--	missing	missing	missing	\N	\N	\N
VCA-886	Primax	--/--/----	--:--	missing	missing	missing	\N	\N	\N
VCP-820	Primax	--/--/----	--:--	missing	missing	missing	\N	\N	\N
VCX-716	Primax	--/--/----	--:--	missing	missing	missing	\N	\N	\N
VDN-818	Primax	--/--/----	--:--	missing	missing	missing	\N	\N	\N
VEC-831	Primax	--/--/----	--:--	missing	missing	missing	\N	\N	\N
V0R-721	Bambas	27/05/2026	11:20	ok	ok	ok	C:/Users/nanie/Desktop/dicas/27-05-2026/V0R-721.jpg	C:/Users/nanie/Desktop/dicas/27-05-2026/V0R-721r.jpg	C:/Users/nanie/Desktop/dicas/27-05-2026/V0R-721r.jpg
VBU-705	Primax	27/05/2026	10:08	ok	ok	ok	C:/Users/nanie/Desktop/dicas/27-05-2026/photo_2026-05-27_10-21-53.jpg	C:/Users/nanie/Desktop/dicas/27-05-2026/photo_2026-05-27_10-21-48.jpg	C:/Users/nanie/Desktop/dicas/27-05-2026/photo_2026-05-27_10-21-45.jpg
V0R-738	Bambas	27/05/2026	11:15	ok	ok	ok	C:/Users/nanie/Desktop/dicas/27-05-2026/V0R-738t.jpg	C:/Users/nanie/Desktop/dicas/27-05-2026/V0R-738r.jpg	C:/Users/nanie/Desktop/dicas/27-05-2026/V0R-738c.jpg
VDO-908	Bambas	27/05/2026	11:01	ok	ok	ok	C:/Users/nanie/Desktop/dicas/27-05-2026/VDO-908t.jpg	C:/Users/nanie/Desktop/dicas/27-05-2026/VDO-908r.jpg	C:/Users/nanie/Desktop/dicas/27-05-2026/VDO-908c.jpg
VAP-815	Bambas	27/05/2026	10:48	ok	ok	ok	C:/Users/nanie/Desktop/dicas/27-05-2026/VAP-515t.jpg	C:/Users/nanie/Desktop/dicas/27-05-2026/VAP-515r.jpg	C:/Users/nanie/Desktop/dicas/27-05-2026/VAP-515c.jpg
VBU-704	Primax	--/--/----	--:--	missing	missing	missing			
VBU-738	Primax	--/--/----	--:--	missing	missing	missing			
VBU-798	Primax	--/--/----	--:--	missing	missing	missing			
VCX-739	Primax	--/--/----	--:--	missing	missing	missing			
CJR-734	Primax	18/05/2026	16:06	error	ok	ok	C:/Users/nanie/Desktop/dicas/18-05-2026/CJR-734t.jpg	C:/Users/nanie/Desktop/dicas/18-05-2026/CJR-734r.jpg	C:/Users/nanie/Desktop/dicas/18-05-2026/CJR-734c.jpg
CJT-845	Primax	18/05/2026	16:32	ok	ok	ok	C:/Users/nanie/Desktop/dicas/18-05-2026/CJT-845t.jpg	C:/Users/nanie/Desktop/dicas/18-05-2026/CJT-845r.jpg	C:/Users/nanie/Desktop/dicas/18-05-2026/CJT-845c.jpg
CJS-849	Primax	18/05/2026	16:47	ok	ok	ok	C:/Users/nanie/Desktop/dicas/18-05-2026/CJS-849t.jpg	C:/Users/nanie/Desktop/dicas/18-05-2026/CJS-849r.jpg	
CJQ-858	Primax	18/05/2026	16:17	ok	ok	ok	C:/Users/nanie/Desktop/dicas/18-05-2026/CJQ-858t.jpg	C:/Users/nanie/Desktop/dicas/18-05-2026/CJQ-858r.jpg	C:/Users/nanie/Desktop/dicas/18-05-2026/CJQ-858c.jpg
CJR-910	Primax	18/05/2026	16:26	ok	ok	ok	C:/Users/nanie/Desktop/dicas/18-05-2026/CJR-910t.jpg	C:/Users/nanie/Desktop/dicas/18-05-2026/CJR-910r.jpg	C:/Users/nanie/Desktop/dicas/18-05-2026/CJR-910c.jpg
VCW-921	Primax	--/--/----	--:--	missing	missing	missing			
VCW-922	Primax	--/--/----	--:--	missing	missing	missing			
VCW-931	Primax	--/--/----	--:--	missing	missing	missing			
VCX-728	Primax	--/--/----	--:--	missing	missing	missing			
VAM-806	Primax	--/--/----	--:--	missing	missing	missing			
V0N-770	Primax	--/--/----	--:--	missing	missing	missing			
V0T-715	Primax	--/--/----	--:--	missing	missing	missing			
VBY-832	Primax	--/--/----	--:--	missing	missing	missing			
VCW-824	Primax	--/--/----	--:--	missing	missing	missing			
V8A-809	Primax	--/--/----	--:--	missing	missing	missing			
V9F-795	Primax	--/--/----	--:--	missing	missing	missing			
V9V-843	Primax	--/--/----	--:--	missing	missing	missing			
V0M-937	Primax	--/--/----	--:--	missing	missing	missing			
V0R-757	Primax	--/--/----	--:--	missing	missing	missing			
BUW-928	Primax	--/--/----	--:--	missing	missing	missing			
V9V-846	Primax	--/--/----	--:--	missing	missing	missing			
VEZ-930	Bambas	27/05/2026	14:46	ok	ok	ok	C:/Users/nanie/Desktop/dicas/27-05-2026/VEZ-930t.jpg	C:/Users/nanie/Desktop/dicas/27-05-2026/VEZ-930r.jpg	C:/Users/nanie/Desktop/dicas/27-05-2026/VEZ-930c.jpg
VD0-941	Bambas	27/05/2026	14:56	ok	ok	ok	C:/Users/nanie/Desktop/dicas/27-05-2026/VDO-941t.jpg	C:/Users/nanie/Desktop/dicas/27-05-2026/VD0-941r.jpg	C:/Users/nanie/Desktop/dicas/27-05-2026/VD0-941c.jpg
VAP-805	Bambas	20/05/2026	12:25	ok	missing	ok	C:/Users/nanie/Desktop/dicas/22-05-2026/VAP-805t.jpeg		C:/Users/nanie/Desktop/dicas/22-05-2026/VAP-805c.jpg
VAP-819	Bambas	--/--/----	--:--	missing	missing	missing			
VCX-729	Bambas	20/05/2026	12:11	ok	missing	ok	C:/Users/nanie/Desktop/dicas/22-05-2026/VCX-729t.jpeg		C:/Users/nanie/Desktop/dicas/22-05-2026/VCX-729c.jpeg
VOR-748	Bambas	20/05/2026	12:34	ok	ok	ok	C:/Users/nanie/Desktop/dicas/22-05-2026/VOR-748t.jpeg	C:/Users/nanie/Desktop/dicas/22-05-2026/VOR-748r.jpeg	C:/Users/nanie/Desktop/dicas/22-05-2026/VOR-748c.jpg
VCP-807	Bambas	--/--/----	--:--	missing	missing	missing			
CAR-924	Bambas	--/--/----	--:--	missing	missing	missing			
CAR-925	Bambas	--/--/----	--:--	missing	missing	missing			
CAR-943	Bambas	--/--/----	--:--	missing	missing	missing			
CAR-945	Bambas	--/--/----	--:--	missing	missing	missing			
CAR-946	Bambas	--/--/----	--:--	missing	missing	missing			
CAS-701	Bambas	--/--/----	--:--	missing	missing	missing			
CAS-765	Bambas	--/--/----	--:--	missing	missing	missing			
CAS-842	Bambas	--/--/----	--:--	missing	missing	missing			
CAS-843	Bambas	--/--/----	--:--	missing	missing	missing			
CAS-902	Bambas	--/--/----	--:--	missing	missing	missing			
VOR-721	Bambas	--/--/----	--:--	missing	missing	missing			
VOR-737	Bambas	--/--/----	--:--	missing	missing	missing			
VOR-738	Bambas	--/--/----	--:--	missing	missing	missing			
VOR-739	Bambas	--/--/----	--:--	missing	missing	missing			
VOR-772	Bambas	--/--/----	--:--	missing	missing	missing			
VOR-791	Bambas	--/--/----	--:--	missing	missing	missing			
VAM-751	Bambas	--/--/----	--:--	missing	missing	missing			
VAM-782	Bambas	--/--/----	--:--	missing	missing	missing			
VAM-791	Bambas	--/--/----	--:--	missing	missing	missing			
VAP-804	Bambas	--/--/----	--:--	missing	missing	missing			
VAP-812	Bambas	--/--/----	--:--	missing	missing	missing			
VAP-816	Bambas	--/--/----	--:--	missing	missing	missing			
VAP-827	Bambas	--/--/----	--:--	missing	missing	missing			
VAP-813	Bambas	--/--/----	--:--	missing	missing	missing			
VAP-830	Bambas	--/--/----	--:--	missing	missing	missing			
VAP-860	Bambas	--/--/----	--:--	missing	missing	missing			
VAS-917	Bambas	--/--/----	--:--	missing	missing	missing			
VCW-930	Bambas	--/--/----	--:--	missing	missing	missing			
VCX-715	Bambas	--/--/----	--:--	missing	missing	missing			
VDO-941	Bambas	--/--/----	--:--	missing	missing	missing			
VEW-763	Bambas	--/--/----	--:--	missing	missing	missing			
VEW-782	Primax	--/--/----	--:--	missing	missing	missing			
VBZ-701	Bambas	--/--/----	--:--	missing	missing	missing			
VCI-837	Bambas	--/--/----	--:--	missing	missing	missing			
VCP-837	Bambas	--/--/----	--:--	missing	missing	missing			
VCP-839	Bambas	--/--/----	--:--	missing	missing	missing			
VCS-735	Bambas	--/--/----	--:--	missing	missing	missing			
VBF-802	Bambas	--/--/----	--:--	missing	missing	missing			
VFD-863	Bambas	--/--/----	--:--	missing	missing	missing			
V9F-780	Industria	02/03/2026	14:45	na	ok	ok		C:/Users/nanie/Desktop/dicas/02-06-2026/2026-06-02 14.45.58__(PLACA V9F-780).jpg	C:/Users/nanie/Desktop/dicas/02-06-2026/2026-06-02 14.45.45__(PLACA V9F-780).jpg
V9V-860	Industria	02/03/2026	13:42	na	ok	ok		C:/Users/nanie/Desktop/dicas/02-06-2026/2026-06-02 13.42.27__(PLACA V9V-860).jpg	C:/Users/nanie/Desktop/dicas/02-06-2026/2026-06-02 13.42.18__(PLACA V9V-860).jpg
V9E-947	Industria	02/06/2026	13:33	na	na	ok			C:/Users/nanie/Desktop/dicas/02-06-2026/2026-06-02 13.33.08__(PLACA V9E-947).jpg
V9F-778	Industria	02/03/2026	13:07	na	ok	ok		C:/Users/nanie/Desktop/dicas/02-06-2026/2026-06-02 13.07.37__(PLACA V9F-778).jpg	C:/Users/nanie/Desktop/dicas/02-06-2026/2026-06-02 13.07.34__(PLACA V9F-778).jpg
V7L-892	Primax	05/06/2026	11:56	ok	missing	missing	C:/Users/nanie/Desktop/dicas/05-06-2026/photo_2026-06-05_12-30-34.jpg		
V7L-911	Primax	05/06/2026	11:47	ok	missing	missing	C:/Users/nanie/Desktop/dicas/05-06-2026/photo_2026-06-05_12-30-37.jpg		
V8A-803	Industria	05/06/2026	12:07	ok	missing	missing	C:/Users/nanie/Desktop/dicas/05-06-2026/photo_2026-06-05_12-30-33.jpg		
\.


--
-- Data for Name: incidentes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.incidentes (id, placa, operacion, fecha_solicitud, hora_inicio, hora_fin, url_grabacion, fecha_ingreso, estado) FROM stdin;
\.


--
-- Data for Name: incidentes_soporte; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.incidentes_soporte (id, placa, tipo_solicitud, descripcion, operador, estado, fecha) FROM stdin;
8	V0R-877	Otro	l{k<jdñsjboijgfboirtj	pepito	Resuelto	2026-06-12 22:38:34.477408
\.


--
-- Data for Name: inspecciones_flota; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inspecciones_flota (id, placa, fecha, hora, tablet, radio, camaras, img_tablet, img_radio, img_camaras, observaciones) FROM stdin;
12	VBU-716	--/--/----	--:--	missing	missing	missing				\N
13	VBU-717	--/--/----	--:--	missing	missing	missing	\N	\N	\N	\N
14	VBU-733	--/--/----	--:--	missing	missing	missing	\N	\N	\N	\N
16	VBU-752	--/--/----	--:--	missing	missing	missing	\N	\N	\N	\N
18	VBU-765	--/--/----	--:--	missing	missing	missing	\N	\N	\N	\N
19	VBY-773	--/--/----	--:--	missing	missing	missing	\N	\N	\N	\N
20	VBY-850	--/--/----	--:--	missing	missing	missing	\N	\N	\N	\N
21	VBY-886	--/--/----	--:--	missing	missing	missing	\N	\N	\N	\N
22	VCA-886	--/--/----	--:--	missing	missing	missing	\N	\N	\N	\N
23	VCP-820	--/--/----	--:--	missing	missing	missing	\N	\N	\N	\N
24	VCX-716	--/--/----	--:--	missing	missing	missing	\N	\N	\N	\N
25	VDN-818	--/--/----	--:--	missing	missing	missing	\N	\N	\N	\N
26	VEC-831	--/--/----	--:--	missing	missing	missing	\N	\N	\N	\N
32	VBU-704	--/--/----	--:--	missing	missing	missing				\N
33	VBU-738	--/--/----	--:--	missing	missing	missing				\N
34	VBU-798	--/--/----	--:--	missing	missing	missing				\N
35	VCX-739	--/--/----	--:--	missing	missing	missing				\N
41	VCW-921	--/--/----	--:--	missing	missing	missing				\N
42	VCW-922	--/--/----	--:--	missing	missing	missing				\N
43	VCW-931	--/--/----	--:--	missing	missing	missing				\N
44	VCX-728	--/--/----	--:--	missing	missing	missing				\N
45	VAM-806	--/--/----	--:--	missing	missing	missing				\N
46	V0N-770	--/--/----	--:--	missing	missing	missing				\N
47	V0T-715	--/--/----	--:--	missing	missing	missing				\N
48	VBY-832	--/--/----	--:--	missing	missing	missing				\N
49	VCW-824	--/--/----	--:--	missing	missing	missing				\N
50	V8A-809	--/--/----	--:--	missing	missing	missing				\N
51	V9F-795	--/--/----	--:--	missing	missing	missing				\N
52	V9V-843	--/--/----	--:--	missing	missing	missing				\N
53	V0M-937	--/--/----	--:--	missing	missing	missing				\N
54	V0R-757	--/--/----	--:--	missing	missing	missing				\N
5	VBX-798	21/05/2026	15:22	ok	ok	missing	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398240/flotas_inspecciones/ok56tjkwrfccvb4o7ra6.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398241/flotas_inspecciones/caqf9y66irypw1m4iam4.jpg		\N
6	VBY-760	20/05/2026	15:43	ok	missing	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398242/flotas_inspecciones/rkeovglnxyditqrg7jsa.jpg		https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398243/flotas_inspecciones/epfctmjslvptxsnszx4t.jpg	\N
9	VBY-830	22/05/2026	10:39	ok	ok	missing	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398246/flotas_inspecciones/wffkhl46lbq42bad3pbb.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398248/flotas_inspecciones/gph0y1eupudqyy0rvcvd.jpg		\N
37	CJT-845	2026-05-18	16:32	ok	ok	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398248/flotas_inspecciones/sm67qvkfphnmjvhgxcpi.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398250/flotas_inspecciones/uxpkkfpcvfuaaa3etkpt.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398251/flotas_inspecciones/ovxqs2cgfwojtoocei14.jpg	
11	VEW-740	22/05/2026	09:00	ok	ok	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398252/flotas_inspecciones/jgszlrjbjtif9uodae1e.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398253/flotas_inspecciones/jr9mz03gs8fyuq6hmj2o.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398254/flotas_inspecciones/oww3ldi1abay7qpkqdbw.jpg	\N
4	VBU-712	2026-05-12	08:38	ok	Falta revision	Falta revision	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398260/flotas_inspecciones/eum7remnujkxwwggqwcr.jpg			
3	VAM-800	2026-05-22	10:39	Falta revision	ok	ok	\N	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398260/flotas_inspecciones/xosz7ig1cawec081avhu.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398261/flotas_inspecciones/ytgvtsej5eavrhmmoi5i.jpg	
2	V9V-856	2026-05-21	16:17	ok	ok	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398264/flotas_inspecciones/dhvdetmtqi9zn41opoml.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398265/flotas_inspecciones/teorz2xwuslm0dnkcqpe.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398266/flotas_inspecciones/cxcxpr6srroabjxzyzk8.jpg	
27	V0R-721	2026-05-27	11:20	ok	ok	OK	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398269/flotas_inspecciones/h54pgundmpecnj9fbr1r.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398270/flotas_inspecciones/qtcpkashs5ktk2kaeq1y.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398271/flotas_inspecciones/mis8bgivnzshaljo9hsr.jpg	\N
31	VAP-815	2026-05-27	10:48	ok	ok	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398234/flotas_inspecciones/oox0t1vjuzc4ls6xhu1b.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398235/flotas_inspecciones/cehpdnptnvhc20bj5vnl.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398236/flotas_inspecciones/irep9a12pqc9ahvfwmnc.jpg	
38	CJS-849	2026-05-18	16:47	ok	ok	Falta revision	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398272/flotas_inspecciones/inq1ngpqn0ic4gv4ya4e.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398273/flotas_inspecciones/tsmonvgmiznqjtzewppe.jpg		
30	VDO-908	2026-05-27	11:01	ok	ok	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398237/flotas_inspecciones/u588xkwufdoiqo87j0nb.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398238/flotas_inspecciones/eoyhpaq9cn2fx51dyi9a.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398239/flotas_inspecciones/jsz393uf6bs4krwhcrvs.jpg	
7	VBY-798	22/05/2026	10:35	ok	ok	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398244/flotas_inspecciones/f1yasrh4oubobvyu81fq.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398245/flotas_inspecciones/wja3m8lo0kccgozvj1ye.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398246/flotas_inspecciones/wrmnwvbbisif2nzo2uy3.jpg	\N
10	VBY-926	2026-05-22	10:41	ok	ok	missing	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398278/flotas_inspecciones/czo2uxxckwxv6zarlt8g.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398279/flotas_inspecciones/z90c1uoihrvgrmpnrvqo.jpg		
29	V0R-738	2026-05-27	11:15	ok	ok	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398282/flotas_inspecciones/ga3vi5kbnidkxjvoenxj.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398283/flotas_inspecciones/zepc4cvbimrojwcn5fpi.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398284/flotas_inspecciones/cp3xpakmwgxepmlcqjts.jpg	
55	BUW-928	--/--/----	--:--	missing	missing	missing				\N
56	V9V-846	--/--/----	--:--	missing	missing	missing				\N
60	VAP-819	--/--/----	--:--	missing	missing	missing				\N
63	VCP-807	--/--/----	--:--	missing	missing	missing				\N
64	CAR-924	--/--/----	--:--	missing	missing	missing				\N
65	CAR-925	--/--/----	--:--	missing	missing	missing				\N
66	CAR-943	--/--/----	--:--	missing	missing	missing				\N
67	CAR-945	--/--/----	--:--	missing	missing	missing				\N
68	CAR-946	--/--/----	--:--	missing	missing	missing				\N
69	CAS-701	--/--/----	--:--	missing	missing	missing				\N
70	CAS-765	--/--/----	--:--	missing	missing	missing				\N
71	CAS-842	--/--/----	--:--	missing	missing	missing				\N
72	CAS-843	--/--/----	--:--	missing	missing	missing				\N
73	CAS-902	--/--/----	--:--	missing	missing	missing				\N
75	VOR-737	--/--/----	--:--	missing	missing	missing				\N
76	VOR-738	--/--/----	--:--	missing	missing	missing				\N
77	VOR-739	--/--/----	--:--	missing	missing	missing				\N
78	VOR-772	--/--/----	--:--	missing	missing	missing				\N
79	VOR-791	--/--/----	--:--	missing	missing	missing				\N
80	VAM-751	--/--/----	--:--	missing	missing	missing				\N
81	VAM-782	--/--/----	--:--	missing	missing	missing				\N
82	VAM-791	--/--/----	--:--	missing	missing	missing				\N
83	VAP-804	--/--/----	--:--	missing	missing	missing				\N
84	VAP-812	--/--/----	--:--	missing	missing	missing				\N
85	VAP-816	--/--/----	--:--	missing	missing	missing				\N
86	VAP-827	--/--/----	--:--	missing	missing	missing				\N
87	VAP-813	--/--/----	--:--	missing	missing	missing				\N
88	VAP-830	--/--/----	--:--	missing	missing	missing				\N
89	VAP-860	--/--/----	--:--	missing	missing	missing				\N
90	VAS-917	--/--/----	--:--	missing	missing	missing				\N
91	VCW-930	--/--/----	--:--	missing	missing	missing				\N
92	VCX-715	--/--/----	--:--	missing	missing	missing				\N
94	VEW-763	--/--/----	--:--	missing	missing	missing				\N
95	VEW-782	--/--/----	--:--	missing	missing	missing				\N
96	VBZ-701	--/--/----	--:--	missing	missing	missing				\N
97	VCI-837	--/--/----	--:--	missing	missing	missing				\N
98	VCP-837	--/--/----	--:--	missing	missing	missing				\N
99	VCP-839	--/--/----	--:--	missing	missing	missing				\N
100	VCS-735	--/--/----	--:--	missing	missing	missing				\N
101	VBF-802	--/--/----	--:--	missing	missing	missing				\N
102	VFD-863	--/--/----	--:--	missing	missing	missing				\N
1	V8A-794	2026-05-12	10:21	ok	ok	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398287/flotas_inspecciones/o2s37p6fiys3xm5pb9fs.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398288/flotas_inspecciones/ammf8qdiinrpxw4wgquu.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398289/flotas_inspecciones/taidc3tvk1xe2ls3vg1n.jpg	
61	VCX-729	20/05/2026	12:11	ok	missing	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398291/flotas_inspecciones/yxy8wkhbdhugmbglokxg.jpg		https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398292/flotas_inspecciones/awr9kz1b8jx6oty4xm7c.jpg	\N
58	VD0-941	2026-05-27	14:56	ok	ok	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398298/flotas_inspecciones/el40mvmdadge46qez5hc.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398299/flotas_inspecciones/gdziniakhgtr5tde7rch.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398299/flotas_inspecciones/qfze30aimb5vuax7u31g.jpg	
107	V7L-892	05/06/2026	11:56	ok	missing	missing	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398304/flotas_inspecciones/p2mjokgmx6e67wkdskpa.jpg			\N
108	V7L-911	05/06/2026	11:47	ok	missing	missing	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398304/flotas_inspecciones/rs1mia7x5qu9pmrincyc.jpg			\N
109	V8A-803	05/06/2026	12:07	ok	missing	missing	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398305/flotas_inspecciones/zgzqcgmtqhqb7zklzmrb.jpg			\N
125	VEW-776	2026-06-05	16:34	OK	OK	OK	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398321/flotas_inspecciones/rz0tkvx8yfkxakpvhd7q.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398322/flotas_inspecciones/iroo8kuw104ud3xrdoth.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398323/flotas_inspecciones/ct1mncqrxelegy6k4ecm.jpg	\N
120	CAS-842	2026-06-09	13:21	OK	OK	OK	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398327/flotas_inspecciones/ksbfchsn3dtdcbfhj7bi.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398328/flotas_inspecciones/nw6fyr30iko9ocq5jdzr.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398330/flotas_inspecciones/jihwonfhowkcefotrjjv.jpg	ok
118	VCI-837	2026-06-09	10:28	OK	OK	OK	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398335/flotas_inspecciones/tnyifikdt08fbmsnsi5p.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398336/flotas_inspecciones/nijoisbrdsayrchixbg3.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398338/flotas_inspecciones/h0xnien9d7fdxzcwqhso.jpg	\N
131	VBY-814	2026-06-10	13:32	OK	OK	OK	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398349/flotas_inspecciones/fyviqgqobps01mhntdjp.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398351/flotas_inspecciones/nupyoof1hjjrvq4ofbci.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398352/flotas_inspecciones/s0cbnxbog37k7ykfsiku.jpg	
133	VEW-722	2026-06-02	16:14	OK	OK	Falta revision	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398358/flotas_inspecciones/u6nyqgocf5ippzn8rksg.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398361/flotas_inspecciones/rizqkbw1yohqtupnaqix.jpg		
103	V9F-780	2026-06-02	14:45	Falta revision	ok	ok		https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398368/flotas_inspecciones/sjnez2f9fepirfopbtc4.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398369/flotas_inspecciones/dh04nh5hhoau0zyd1blw.jpg	
134	VEW-721	2026-06-02	16:15	OK	OK	Falta revision	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398371/flotas_inspecciones/pobdwjbldphdxfjdylj5.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398373/flotas_inspecciones/elpyw2k8vhedexkuyx0c.jpg		
139	F3L-787	2026-06-11	11:57	No Aplica	No Aplica	No Aplica				No aplica equipos tecnologicos.
141	V9T-950	2026-06-12	15:15	No Aplica	No Aplica	Falta revision				vehiculo usado en transporte de personal
40	CJR-910	2026-05-18	16:26	ok	ok	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398254/flotas_inspecciones/k2kvsr2zjcna76rfta9w.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398255/flotas_inspecciones/kbrwfwpdu3d2jkehaqyj.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398256/flotas_inspecciones/xl4dijltrhnomrddv111.jpg	
36	CJR-734	2026-05-18	16:06	Error	ok	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398257/flotas_inspecciones/e0hl43zdjposbrhp7e4w.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398258/flotas_inspecciones/slspxxw8wbolbvs4vhyh.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398259/flotas_inspecciones/oxci3vz21tbef1rvi6ky.jpg	Tablet presenta error en el aplicativo copiloto
39	CJQ-858	18/05/2026	16:17	ok	ok	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398262/flotas_inspecciones/u1qd5pbbtzncymyoojxz.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398262/flotas_inspecciones/ag2cerzvb5ozt2mmeyo2.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398263/flotas_inspecciones/hk5uxh7qdah4vuucq2ey.jpg	\N
8	VBY-814	2026-05-22	10:31	Error	ok	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398266/flotas_inspecciones/tgfdilqe6fy029c8aukr.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398267/flotas_inspecciones/e1vki9mlo6kddcfzo6na.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398268/flotas_inspecciones/g2u0t8zmh8fxdhs7r4ne.jpg	Tablet presenta error en copiloto
17	VBU-754	2026-05-26	09:40	ok	ok	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398274/flotas_inspecciones/dapakfclnqnhpbohlosv.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398274/flotas_inspecciones/wpmssq0wzf6a1thyq5kb.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398275/flotas_inspecciones/obcdngsyybtd2owascan.jpg	
15	VBU-736	2026-05-26	09:27	ok	ok	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398276/flotas_inspecciones/nggqrdsjrsjufhnahw51.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398277/flotas_inspecciones/lazxjr30jmoxtiibdvvb.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398278/flotas_inspecciones/gt6ylxty4u55mra2uzed.jpg	
28	VBU-705	2026-05-27	10:08	ok	ok	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398280/flotas_inspecciones/dxuerythegjmuuhxfjad.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398281/flotas_inspecciones/pa12xd8wvporf37skupn.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398281/flotas_inspecciones/ecr4fovevqcsqpdagafp.jpg	
57	VEZ-930	27/05/2026	14:46	ok	ok	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398284/flotas_inspecciones/ss22vthqel7dsjsl4tmj.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398286/flotas_inspecciones/lnd1subfe9emjmqzfrak.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398286/flotas_inspecciones/xlkxolenflp9kiszp4bg.jpg	\N
59	VAP-805	20/05/2026	12:25	ok	missing	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398290/flotas_inspecciones/oxrl4pbk0xskuse8vyqw.jpg		https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398290/flotas_inspecciones/lqwsyyfu9l1pn1ucs1he.jpg	\N
62	VOR-748	20/05/2026	12:34	ok	ok	ok	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398293/flotas_inspecciones/r41xcl9m8wqw7jxy1sjx.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398293/flotas_inspecciones/pkd4asemlfzc6gomogsr.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398294/flotas_inspecciones/qrbk7mgu4ursddoy6rbj.jpg	\N
105	V9E-947	2026-06-02	13:33	No Aplica	No Aplica	ok			https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398296/flotas_inspecciones/ijbmd8yf9ogobhputouv.jpg	Unidad de cargas diversas, no aplica tablet y radio base.\r\nSe sicronizo las fecha y hora del dvr.
106	V9F-778	2026-06-02	13:07	Falta revision	ok	ok		https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398301/flotas_inspecciones/d9lx8dty1vvs1t2a93ft.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398303/flotas_inspecciones/u6xd695qjzbtjswikymz.jpg	
119	VOR-739	2026-06-09	12:47	OK	OK	OK	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398307/flotas_inspecciones/g7hmeohbs0jxmtark8cj.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398309/flotas_inspecciones/txkq0ojihcqmgxb7agoj.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398311/flotas_inspecciones/ve81cvfohfmypguiljmo.jpg	\N
121	VCW-930	2026-06-09	13:22	OK	OK	OK	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398312/flotas_inspecciones/joqanpvptzbvhfmppape.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398314/flotas_inspecciones/gfbxzc4f8gx2th2xhjq8.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398315/flotas_inspecciones/usk4kfacudxkkwrcyjkj.jpg	\N
122	VCX-715	2026-06-09	15:38	OK	OK	OK	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398317/flotas_inspecciones/fehms3q2wtgpznaylcnx.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398319/flotas_inspecciones/p8vqfnppupqzlpnr5pkv.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398320/flotas_inspecciones/xu2kghqdor5pjtapistr.jpg	\N
126	VEW-776	2026-06-05	16:34	OK	OK	OK	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398324/flotas_inspecciones/mz9evrngmtpmr1rvjaoc.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398325/flotas_inspecciones/eh02hql9xqkhsomzs7xf.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398325/flotas_inspecciones/h5oksobgonvxu57jjihc.jpg	\N
127	V6V-849	2026-06-10	11:27	OK	No Aplica	OK	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398332/flotas_inspecciones/o6fenxnjgmvxofnoflla.jpg		https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398333/flotas_inspecciones/kcyjzrnrcrxmrl3dmzhq.jpg	Radio base no aplica, falta descargar videos de la cámaras.
129	VCX-716	2026-06-10	13:30	OK	OK	OK	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398339/flotas_inspecciones/lmgc1fe6ipfm0gci8vef.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398341/flotas_inspecciones/yle7qwuaowyv3wiutrpa.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398342/flotas_inspecciones/ksby0rx6zihqghltzmd9.jpg	
137	V0R-877	2026-06-11	11:39	OK	OK	OK	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398385/flotas_inspecciones/p7pwoxgareqkswo8wzzt.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398387/flotas_inspecciones/iuxkyvnpaslsxqdaoqvk.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398388/flotas_inspecciones/veufliz5pgyer6wiezj1.jpg	
130	VCA-886	2026-06-10	13:31	OK	OK	OK	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398344/flotas_inspecciones/rfzpipqjqdiaa4faxnyw.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398345/flotas_inspecciones/b9omnlpt9fos6adpqiqr.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398347/flotas_inspecciones/h2la6dfqjadbagt1cgpj.jpg	
104	V9V-860	2026-06-02	13:42	No Aplica	ok	ok		https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398355/flotas_inspecciones/tgriup6dpit0f2dm7euj.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398357/flotas_inspecciones/a0dtrtaurgkwii0zw3bq.jpg	no aplica tablet, se retiro para uso de otra unidad de primax
132	VDO-908	2026-06-10	16:04	OK	OK	OK	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398363/flotas_inspecciones/sbjzytoqrsaejlsl3qej.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398365/flotas_inspecciones/zobj7swwf9ee8razad3y.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398366/flotas_inspecciones/debfsws7v42lr6hzndxj.jpg	Adicional se hizo descarga de videos incidente con fecha 11/05/2026 13:30-15:00
124	V9V-856	2026-06-09	16:11	OK	OK	OK	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398374/flotas_inspecciones/fc1jdwslp33ucpaewc4p.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398377/flotas_inspecciones/igbbapj32z34sykv8xdm.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398379/flotas_inspecciones/wrvhwdpe27rzgq59lk11.jpg	
135	VEW-774	2026-06-01	16:17	OK	OK	Falta revision	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398381/flotas_inspecciones/ssmmoqkpe9zirruwqmmz.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398382/flotas_inspecciones/i4feiqcrzwm5ljqqxo25.jpg		
136	V0R-748	2026-05-20	16:22	OK	OK	Falta revision	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398383/flotas_inspecciones/iifwvfj8useeevwvwfem.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398384/flotas_inspecciones/cbltck74vy5afkzpowps.jpg		
138	VCI-837	2026-06-11	11:43	OK	OK	OK	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398390/flotas_inspecciones/wfr0an5rpagxvnbqbfco.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398393/flotas_inspecciones/xl0vy6xtzquz6vastuod.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398395/flotas_inspecciones/fgxf54dw12b8kgolhgki.jpg	
140	V7Z-928	2026-06-11	12:30	OK	OK	Error	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398397/flotas_inspecciones/q5vwcipk1edscfd5adno.jpg	https://res.cloudinary.com/dmhztgy7y/image/upload/v1781398398/flotas_inspecciones/z5ob0fbdy4cfjogt5lao.jpg		Solicitar inspección a Telecom para revisión de operatividad de cámara 
\.


--
-- Data for Name: mantenimientos_tecnicos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mantenimientos_tecnicos (id, placa, fecha_ejecutada, frecuencia_dias, dvr, copiloto, radio_base, handy, camara_interna, camara_externa, camara_retroceso, sensores_retroceso, sensores_delanteros, sistema_adas, created_at) FROM stdin;
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, username, password_hash, rol, created_at) FROM stdin;
1	admin	$2b$10$KupjcBGqHlBnpI/0CmN/yu2FT6SBmQ8tpsUC7Ir9.qst6QouOQXBy	admin	2026-06-09 00:38:54.542013
\.


--
-- Data for Name: vehiculos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vehiculos (placa, programa, tipo_vehiculo, marca_tracto, modelo_tracto, anio_fabricacion, operacion, cliente) FROM stdin;
VCW-824	Primax	\N	\N	\N	\N	\N	\N
VBY-886	Primax	\N	\N	\N	\N	\N	\N
CAR-943	Bambas	\N	\N	\N	\N	\N	\N
VBU-705	Primax	\N	\N	\N	\N	\N	\N
V0M-937	Primax	\N	\N	\N	\N	\N	\N
V0T-715	Primax	\N	\N	\N	\N	\N	\N
VEC-831	Primax	\N	\N	\N	\N	\N	\N
VBU-738	Primax	\N	\N	\N	\N	\N	\N
VAS-917	Bambas	\N	\N	\N	\N	\N	\N
VAM-751	Bambas	\N	\N	\N	\N	\N	\N
VEW-782	Primax	\N	\N	\N	\N	\N	\N
CJT-845	Primax	\N	\N	\N	\N	\N	\N
VAP-830	Bambas	\N	\N	\N	\N	\N	\N
VEW-763	Bambas	\N	\N	\N	\N	\N	\N
V0N-770	Primax	\N	\N	\N	\N	\N	\N
VCW-922	Primax	\N	\N	\N	\N	\N	\N
V9F-795	Primax	\N	\N	\N	\N	\N	\N
V0R-721	Bambas	\N	\N	\N	\N	\N	\N
VCP-837	Bambas	\N	\N	\N	\N	\N	\N
VAP-816	Bambas	\N	\N	\N	\N	\N	\N
CAS-902	Bambas	\N	\N	\N	\N	\N	\N
VBU-717	Primax	\N	\N	\N	\N	\N	\N
CAR-946	Bambas	\N	\N	\N	\N	\N	\N
VBY-773	Primax	\N	\N	\N	\N	\N	\N
VBY-832	Primax	\N	\N	\N	\N	\N	\N
VBX-798	Primax	\N	\N	\N	\N	\N	\N
VAP-804	Bambas	\N	\N	\N	\N	\N	\N
VOR-748	Bambas	\N	\N	\N	\N	\N	\N
CJQ-858	Primax	\N	\N	\N	\N	\N	\N
CAS-765	Bambas	\N	\N	\N	\N	\N	\N
VCW-921	Primax	\N	\N	\N	\N	\N	\N
VAP-813	Bambas	\N	\N	\N	\N	\N	\N
VOR-791	Bambas	\N	\N	\N	\N	\N	\N
VCX-739	Primax	\N	\N	\N	\N	\N	\N
V0R-738	Bambas	\N	\N	\N	\N	\N	\N
VCW-931	Primax	\N	\N	\N	\N	\N	\N
VBY-926	Primax	\N	\N	\N	\N	\N	\N
VAP-860	Bambas	\N	\N	\N	\N	\N	\N
V8A-794	Primax	\N	\N	\N	\N	\N	\N
VD0-941	Bambas	\N	\N	\N	\N	\N	\N
VFD-863	Bambas	\N	\N	\N	\N	\N	\N
VAM-800	Primax	\N	\N	\N	\N	\N	\N
V8A-809	Primax	\N	\N	\N	\N	\N	\N
V7L-911	Primax	\N	\N	\N	\N	\N	\N
V9V-843	Primax	\N	\N	\N	\N	\N	\N
V7L-892	Primax	\N	\N	\N	\N	\N	\N
VAP-827	Bambas	\N	\N	\N	\N	\N	\N
VCP-839	Bambas	\N	\N	\N	\N	\N	\N
VOR-772	Bambas	\N	\N	\N	\N	\N	\N
VOR-738	Bambas	\N	\N	\N	\N	\N	\N
CJR-910	Primax	\N	\N	\N	\N	\N	\N
VCP-820	Primax	\N	\N	\N	\N	\N	\N
VBU-716	Primax	\N	\N	\N	\N	\N	\N
VBU-798	Primax	\N	\N	\N	\N	\N	\N
VDN-818	Primax	\N	\N	\N	\N	\N	\N
VCX-729	Bambas	\N	\N	\N	\N	\N	\N
CAR-945	Bambas	\N	\N	\N	\N	\N	\N
VCX-728	Primax	\N	\N	\N	\N	\N	\N
V9F-778	Industria	\N	\N	\N	\N	\N	\N
VAP-812	Bambas	\N	\N	\N	\N	\N	\N
VBY-760	Primax	\N	\N	\N	\N	\N	\N
VBZ-701	Bambas	\N	\N	\N	\N	\N	\N
VAP-805	Bambas	\N	\N	\N	\N	\N	\N
VBF-802	Bambas	\N	\N	\N	\N	\N	\N
VBY-798	Primax	\N	\N	\N	\N	\N	\N
BUW-928	Primax	\N	\N	\N	\N	\N	\N
V9E-947	Industria	\N	\N	\N	\N	\N	\N
VBU-704	Primax	\N	\N	\N	\N	\N	\N
VAM-791	Bambas	\N	\N	\N	\N	\N	\N
VAP-819	Bambas	\N	\N	\N	\N	\N	\N
VBU-733	Primax	\N	\N	\N	\N	\N	\N
CAR-925	Bambas	\N	\N	\N	\N	\N	\N
CAS-701	Bambas	\N	\N	\N	\N	\N	\N
VAM-806	Primax	\N	\N	\N	\N	\N	\N
CAS-843	Bambas	\N	\N	\N	\N	\N	\N
V9V-846	Primax	\N	\N	\N	\N	\N	\N
CJR-734	Primax	\N	\N	\N	\N	\N	\N
VBU-754	Primax	\N	\N	\N	\N	\N	\N
VCS-735	Bambas	\N	\N	\N	\N	\N	\N
VBY-850	Primax	\N	\N	\N	\N	\N	\N
V0R-757	Primax	\N	\N	\N	\N	\N	\N
CAR-924	Bambas	\N	\N	\N	\N	\N	\N
VAP-815	Bambas	\N	\N	\N	\N	\N	\N
VBY-830	Primax	\N	\N	\N	\N	\N	\N
CJS-849	Primax	\N	\N	\N	\N	\N	\N
VBU-765	Primax	\N	\N	\N	\N	\N	\N
VCP-807	Bambas	\N	\N	\N	\N	\N	\N
VBU-752	Primax	\N	\N	\N	\N	\N	\N
VEZ-930	Bambas	\N	\N	\N	\N	\N	\N
VAM-782	Bambas	\N	\N	\N	\N	\N	\N
VEW-740	Primax	\N	\N	\N	\N	\N	\N
VBU-712	Primax	\N	\N	\N	\N	\N	\N
VOR-737	Bambas	\N	\N	\N	\N	\N	\N
VBU-736	Primax	\N	\N	\N	\N	\N	\N
V8A-803	Industrias	\N	\N	\N	\N	\N	\N
V9V-860	Primax	\N	\N	\N	\N	\N	\N
V0R-877	Industrias						
V9F-780	Industrias	\N	\N	\N	\N	\N	\N
F3L-787	Industrias	demo	demo	demo	demo	demo	demo
V9T-950	Falta identificar	\N	\N	\N	\N	\N	\N
VOR-739	Bambas	\N	\N	\N	\N	\N	\N
DEMO-123	Primax	\N	\N	\N	\N	\N	\N
VCW-930	Bambas	\N	\N	\N	\N	\N	\N
VCX-715	Bambas	\N	\N	\N	\N	\N	\N
CAS-842	Bambas	\N	\N	\N	\N	\N	\N
V9V-856	Primax	\N	\N	\N	\N	\N	\N
VEW-776	Primax	\N	\N	\N	\N	\N	\N
D4R-972	Falta identificar	\N	\N	\N	\N	\N	\N
VAL-827	Falta identificar	\N	\N	\N	\N	\N	\N
V6V-849	Industrias	\N	\N	\N	\N	\N	\N
VCX-716	Primax	\N	\N	\N	\N	\N	\N
VCA-886	Primax	\N	\N	\N	\N	\N	\N
VBY-814	Primax	\N	\N	\N	\N	\N	\N
VDO-908	Bambas	\N	\N	\N	\N	\N	\N
VEW-722	Falta identificar	\N	\N	\N	\N	\N	\N
VEW-721	Falta identificar	\N	\N	\N	\N	\N	\N
VEW-774	Falta identificar	\N	\N	\N	\N	\N	\N
V0R-748	Falta identificar	\N	\N	\N	\N	\N	\N
VCW-924	Primax	\N	\N	\N	\N	\N	\N
V9V-867	Primax	\N	\N	\N	\N	\N	\N
VCI-837	Bambas	\N	\N	\N	\N	\N	\N
V7Z-928	Falta identificar	\N	\N	\N	\N	\N	\N
\.


--
-- Name: entregas_ti_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.entregas_ti_id_seq', 77, true);


--
-- Name: incidentes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.incidentes_id_seq', 1, false);


--
-- Name: incidentes_soporte_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.incidentes_soporte_id_seq', 8, true);


--
-- Name: inspecciones_flota_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inspecciones_flota_id_seq', 142, true);


--
-- Name: mantenimientos_tecnicos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mantenimientos_tecnicos_id_seq', 1, false);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 1, true);


--
-- Name: entregas_ti entregas_ti_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entregas_ti
    ADD CONSTRAINT entregas_ti_pkey PRIMARY KEY (id);


--
-- Name: equipos_flota equipos_flota_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipos_flota
    ADD CONSTRAINT equipos_flota_pkey PRIMARY KEY (placa);


--
-- Name: incidentes incidentes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidentes
    ADD CONSTRAINT incidentes_pkey PRIMARY KEY (id);


--
-- Name: incidentes_soporte incidentes_soporte_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidentes_soporte
    ADD CONSTRAINT incidentes_soporte_pkey PRIMARY KEY (id);


--
-- Name: inspecciones_flota inspecciones_flota_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inspecciones_flota
    ADD CONSTRAINT inspecciones_flota_pkey PRIMARY KEY (id);


--
-- Name: mantenimientos_tecnicos mantenimientos_tecnicos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mantenimientos_tecnicos
    ADD CONSTRAINT mantenimientos_tecnicos_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_username_key UNIQUE (username);


--
-- Name: vehiculos vehiculos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehiculos
    ADD CONSTRAINT vehiculos_pkey PRIMARY KEY (placa);


--
-- Name: ix_equipos_flota_placa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_equipos_flota_placa ON public.equipos_flota USING btree (placa);


--
-- Name: ix_equipos_flota_programa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_equipos_flota_programa ON public.equipos_flota USING btree (programa);


--
-- Name: ix_incidentes_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_incidentes_id ON public.incidentes USING btree (id);


--
-- Name: ix_incidentes_placa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_incidentes_placa ON public.incidentes USING btree (placa);


--
-- Name: inspecciones_flota inspecciones_flota_placa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inspecciones_flota
    ADD CONSTRAINT inspecciones_flota_placa_fkey FOREIGN KEY (placa) REFERENCES public.vehiculos(placa);


--
-- PostgreSQL database dump complete
--

\unrestrict Ldpnp0inLeaiXWpmacySrJMRFYgJGsgQLOdZDDV3Ih3xL4oFfb3Y4TTcd2xaqQf

