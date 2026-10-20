CREATE TABLE holidays (
    id UUID PRIMARY KEY,
    holiday_date DATE NOT NULL,
    name VARCHAR(120) NOT NULL,
    scope VARCHAR(20) NOT NULL,
    location VARCHAR(120),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT uk_holidays_date UNIQUE (holiday_date),
    CONSTRAINT ck_holidays_scope
        CHECK (scope IN ('NATIONAL', 'REGIONAL', 'LOCAL'))
);

INSERT INTO holidays (id, holiday_date, name, scope, location, created_at)
VALUES
    (gen_random_uuid(), DATE '2026-01-01', 'Año Nuevo', 'NATIONAL', NULL, now()),
    (gen_random_uuid(), DATE '2026-01-06', 'Epifanía del Señor', 'NATIONAL', NULL, now()),
    (gen_random_uuid(), DATE '2026-04-02', 'Jueves Santo', 'REGIONAL', 'Castilla-La Mancha', now()),
    (gen_random_uuid(), DATE '2026-04-03', 'Viernes Santo', 'NATIONAL', NULL, now()),
    (gen_random_uuid(), DATE '2026-05-01', 'Fiesta del Trabajo', 'NATIONAL', NULL, now()),
    (gen_random_uuid(), DATE '2026-06-15', 'Festivo local de Toledo', 'LOCAL', 'Toledo', now()),
    (gen_random_uuid(), DATE '2026-08-15', 'Asunción de la Virgen', 'NATIONAL', NULL, now()),
    (gen_random_uuid(), DATE '2026-10-12', 'Fiesta Nacional de España', 'NATIONAL', NULL, now()),
    (gen_random_uuid(), DATE '2026-11-01', 'Todos los Santos', 'NATIONAL', NULL, now()),
    (gen_random_uuid(), DATE '2026-12-06', 'Día de la Constitución Española', 'NATIONAL', NULL, now()),
    (gen_random_uuid(), DATE '2026-12-08', 'Inmaculada Concepción', 'NATIONAL', NULL, now()),
    (gen_random_uuid(), DATE '2026-12-25', 'Navidad', 'NATIONAL', NULL, now());
