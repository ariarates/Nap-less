export const privacyPolicyHtml = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="index,follow" />
    <meta
      name="description"
      content="Política de privacidad de Nap-less: cámara, almacenamiento local y datos faciales."
    />
    <title>Política de privacidad · Nap-less</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #172337;
        background: #f3f6fa;
      }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 40px 18px; line-height: 1.65; }
      main {
        width: min(100%, 760px);
        margin: 0 auto;
        padding: clamp(24px, 5vw, 52px);
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 22px;
        box-shadow: 0 20px 60px rgba(31, 48, 77, .08);
      }
      .brand { color: #087e8b; font-size: .82rem; font-weight: 750; letter-spacing: .12em; text-transform: uppercase; }
      h1 { margin: 12px 0 8px; color: #11233e; font-size: clamp(2rem, 6vw, 2.7rem); line-height: 1.12; letter-spacing: -.04em; }
      .updated, .owner { color: #5d6c81; font-size: .94rem; }
      .notice {
        margin: 24px 0 30px;
        padding: 14px 16px;
        border-left: 4px solid #087e8b;
        border-radius: 8px;
        background: #edf8f8;
        color: #294a55;
        font-size: .92rem;
      }
      h2 { margin: 28px 0 8px; color: #11233e; font-size: 1.2rem; line-height: 1.3; }
      p, li { color: #43536a; }
      p { margin: 8px 0; }
      ul { margin: 8px 0; padding-left: 22px; }
      li + li { margin-top: 6px; }
      a { color: #087e8b; text-underline-offset: 3px; }
      footer { margin-top: 34px; padding-top: 18px; border-top: 1px solid #e7edf3; color: #68778b; font-size: .86rem; }
      @media (max-width: 520px) {
        body { padding: 14px 10px; }
        main { border-radius: 16px; }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div class="brand">Nap-less</div>
        <h1>Política de privacidad</h1>
        <p class="updated">Última actualización: 30 de septiembre de 2026</p>
        <p class="owner">Responsable del proyecto y contacto de privacidad:
          <a href="mailto:ACAP1.0@OUTLOOK.COM">ACAP1.0@OUTLOOK.COM</a> · Estados Unidos
        </p>
      </header>

      <aside class="notice">
        Esta política resume cómo funciona la versión actual de Nap-less. Es información general y no constituye asesoramiento legal.
      </aside>

      <section>
        <h2>Cámara y datos faciales</h2>
        <p>
          Nap-less puede usar la cámara frontal para el registro y los desafíos para despertar.
          Las imágenes se capturan y se manejan en el dispositivo: no se envían a nuestros
          servidores ni se guardan en la galería.
        </p>
        <p>
          En el prototipo actual, la verificación facial está simulada; la app no crea ni guarda
          una plantilla biométrica. Guarda únicamente un token de registro local en
          <code>expo-secure-store</code>. Ese token y las imágenes no salen del dispositivo.
        </p>
      </section>

      <section>
        <h2>Almacenamiento y cuentas</h2>
        <p>
          No necesitas crear una cuenta. La configuración de alarmas se guarda localmente en el
          dispositivo. Nap-less no sube fotos ni datos faciales a servidores.
        </p>
      </section>

      <section>
        <h2>Anuncios y seguimiento</h2>
        <p>
          Nap-less no incluye publicidad, seguimiento publicitario ni herramientas de analítica
          dentro de la app.
        </p>
      </section>

      <section>
        <h2>Cómo borrar los datos</h2>
        <p>
          Puedes borrar el registro facial desde la app. Para eliminar también los ajustes
          locales, borra los datos de Nap-less desde tu dispositivo o desinstala la app.
        </p>
      </section>

      <section>
        <h2>Alojamiento de esta página</h2>
        <p>
          Esta página pública se sirve mediante Replit. El alojamiento podría procesar información
          técnica de las solicitudes conforme a sus propias prácticas; Nap-less no recibe por ello
          fotos ni datos faciales.
        </p>
      </section>

      <footer>
        Para consultas sobre privacidad, escribe a
        <a href="mailto:ACAP1.0@OUTLOOK.COM">ACAP1.0@OUTLOOK.COM</a>.
      </footer>
    </main>
  </body>
</html>`;