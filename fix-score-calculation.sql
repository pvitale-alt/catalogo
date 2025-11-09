-- Script para corregir el cálculo de score
-- Los criterios negativos (esfuerzo, incertidumbre, riesgo) deben RESTAR

-- Actualizar función de cálculo de score
CREATE OR REPLACE FUNCTION calcular_score()
RETURNS TRIGGER AS $$
DECLARE
    positivos DECIMAL(5, 2);
    negativos DECIMAL(5, 2);
BEGIN
    -- Criterios positivos (suman)
    positivos := (
        (NEW.facturacion * NEW.peso_facturacion / 100) +
        (NEW.urgencia * NEW.peso_urgencia / 100) +
        (NEW.facturacion_potencial * NEW.peso_facturacion_potencial / 100) +
        (NEW.impacto_cliente * NEW.peso_impacto_cliente / 100)
    );
    
    -- Criterios negativos (restan)
    negativos := (
        (NEW.esfuerzo * NEW.peso_esfuerzo / 100) +
        (NEW.incertidumbre * NEW.peso_incertidumbre / 100) +
        (NEW.riesgo * NEW.peso_riesgo / 100)
    );
    
    -- Score final = positivos - negativos
    NEW.score_calculado := positivos - negativos;
    
    NEW.updated_at := CURRENT_TIMESTAMP;
    
    -- Actualizar el score en la tabla funcionalidades
    UPDATE funcionalidades 
    SET score_total = NEW.score_calculado,
        updated_at = CURRENT_TIMESTAMP
    WHERE redmine_id = NEW.funcionalidad_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recalcular todos los scores existentes
UPDATE score
SET score_calculado = (
    -- Positivos
    (facturacion * peso_facturacion / 100) +
    (urgencia * peso_urgencia / 100) +
    (facturacion_potencial * peso_facturacion_potencial / 100) +
    (impacto_cliente * peso_impacto_cliente / 100) -
    -- Negativos (restan)
    (esfuerzo * peso_esfuerzo / 100) -
    (incertidumbre * peso_incertidumbre / 100) -
    (riesgo * peso_riesgo / 100)
);

-- Actualizar score_total en funcionalidades
UPDATE funcionalidades f
SET score_total = s.score_calculado,
    updated_at = CURRENT_TIMESTAMP
FROM score s
WHERE f.redmine_id = s.funcionalidad_id;

COMMENT ON FUNCTION calcular_score() IS 'Calcula score: positivos (facturacion, urgencia, facturacion_potencial, impacto_cliente) suman, negativos (esfuerzo, incertidumbre, riesgo) restan';

