## MODIFIED Requirements

### Requirement: Onboarding incompleto hasta completar el Perfil de Talento

El sistema SHALL considerar el onboarding incompleto mientras la cuenta no tenga su Perfil de Talento creado, y SHALL restringir el acceso al resto de la aplicación hasta entonces. Una vez creado el Perfil de Talento, el onboarding SHALL considerarse completo — usar la función de Creador no agrega un segundo requisito de onboarding.

#### Scenario: Acceso sin Perfil de Talento creado
- **WHEN** una persona autenticada sin Perfil de Talento accede a cualquier ruta que no sea el alta de perfil
- **THEN** el sistema la redirige al formulario de alta de su Perfil de Talento

#### Scenario: Onboarding completado
- **WHEN** la persona guarda su Perfil de Talento con todos los campos obligatorios
- **THEN** el sistema marca su onboarding como completo y la lleva al feed

#### Scenario: Usar la función de Creador no exige otro alta
- **WHEN** una persona con su Perfil de Talento ya creado arma su primer Proyecto o Equipo
- **THEN** el sistema no le pide ningún dato de identidad adicional — sólo lo operativo del Proyecto o Equipo (título, roles o cupo, etc.)

## REMOVED Requirements

### Requirement: Elección de rol en el onboarding

**Reason**: Ya no hay dos perfiles de identidad entre los que elegir al empezar — toda cuenta nueva tiene un único perfil personal (Talento). La pantalla de elección de rol y sus dos formularios de alta dejan de tener sentido.

**Migration**: El primer ingreso lleva directo al alta del Perfil de Talento, sin pantalla de elección previa. Quien quiera usar la función de Creador la activa después, creando un Proyecto o un Equipo — no hay "elegir rol" que corregir ni una ruta de alta de Creador que ofrecer desde el alta de Talento.
