-- Script para actualizar el rango de score de 0-5 a 0-10

-- Actualizar constraints de la tabla score
ALTER TABLE score DROP CONSTRAINT IF EXISTS score_origen_check;
ALTER TABLE score DROP CONSTRAINT IF EXISTS score_facturacion_check;
ALTER TABLE score DROP CONSTRAINT IF EXISTS score_urgencia_check;
ALTER TABLE score DROP CONSTRAINT IF EXISTS score_facturacion_potencial_check;
ALTER TABLE score DROP CONSTRAINT IF EXISTS score_impacto_cliente_check;
ALTER TABLE score DROP CONSTRAINT IF EXISTS score_esfuerzo_check;
ALTER TABLE score DROP CONSTRAINT IF EXISTS score_incertidumbre_check;
ALTER TABLE score DROP CONSTRAINT IF EXISTS score_riesgo_check;

-- Agregar nuevos constraints (0-10)
ALTER TABLE score ADD CONSTRAINT score_origen_check CHECK (origen >= 0 AND origen <= 10);
ALTER TABLE score ADD CONSTRAINT score_facturacion_check CHECK (facturacion >= 0 AND facturacion <= 10);
ALTER TABLE score ADD CONSTRAINT score_urgencia_check CHECK (urgencia >= 0 AND urgencia <= 10);
ALTER TABLE score ADD CONSTRAINT score_facturacion_potencial_check CHECK (facturacion_potencial >= 0 AND facturacion_potencial <= 10);
ALTER TABLE score ADD CONSTRAINT score_impacto_cliente_check CHECK (impacto_cliente >= 0 AND impacto_cliente <= 10);
ALTER TABLE score ADD CONSTRAINT score_esfuerzo_check CHECK (esfuerzo >= 0 AND esfuerzo <= 10);
ALTER TABLE score ADD CONSTRAINT score_incertidumbre_check CHECK (incertidumbre >= 0 AND incertidumbre <= 10);
ALTER TABLE score ADD CONSTRAINT score_riesgo_check CHECK (riesgo >= 0 AND riesgo <= 10);

COMMENT ON TABLE score IS 'Scores gestionados manualmente desde la calculadora de Score (rango 0-10)';

