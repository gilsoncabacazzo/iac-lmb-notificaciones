// Método centralizado para responder con CORS, status code y body formateado
import { SESClient ,SendRawEmailCommand} from "@aws-sdk/client-ses";
const sesClient = new SESClient({});
const responder = (statusCode, data, headers = {}) => {
    return {
        statusCode: statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*', // O ajusta el dominio específico de tu SaaS
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,POST',
            'Content-Type': 'application/json',
            ...headers
        },
        body: JSON.stringify(data)
    };
};

export const handler = async (event) => {
    try {
    // 1. Identificamos la ruta o path desde donde se hizo la petición
    // API Gateway (HTTP API v2 usa event.rawPath, REST API usa event.path)
    const currentPath = event.rawPath || event.path || "";
    
    // Validar que sea un método POST (opcional pero recomendado)
    const method = event.requestContext?.http?.method || event.httpMethod;
    if (method && method !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Método no permitido. Solo se acepta POST." }),
      };
    }

    // Parsear el body de forma segura
    const body = typeof event.body === "string" ? JSON.parse(event.body) : (event.body || {});

    // 2. Usamos un switch basado en el path recibido
    switch (true) {
      case currentPath.includes("/notificaciones/email"):
        return await manejarEmail(body);

      case currentPath.includes("/notificaciones/sms"):
        return await manejarSms(body);

      case currentPath.includes("/notificaciones/whatsapp"):
        return await manejarWhatsapp(body);

      default:
        return responder(400,{ error: `Ruta no encontrada: ${currentPath}` });
    }
  } catch (error) {
    console.error("Error en la ejecución de la Lambda de notificaciones:", error);
    return responder(500,{ success: false, error: error.message });
  } 
};

async function manejarEmail(body) {
  // Ahora esperamos también un array opcional de "attachments"
  // Cada adjunto debe tener: { filename, content (en base64), contentType }
  const { to, subject, message, htmlMessage, attachments } = body;

  if (!to || !subject || (!message && !htmlMessage)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Faltan parámetros para el correo: 'to', 'subject' y 'message' (o 'htmlMessage')." }),
    };
  }

  const senderEmail = process.env.SENDER_EMAIL || "no-reply@dev.docfy.shop";
  const recipients = Array.isArray(to) ? to.join(", ") : to;
  const boundary = "----=_Part_Docfy_Boundary_" + Date.now();

  // 1. Construir las cabeceras del correo MIME Multipart
  let rawMessage = [
    `From: ${senderEmail}`,
    `To: ${recipients}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
  ];

  // 2. Parte del cuerpo del mensaje (Texto plano o HTML)
  rawMessage.push(`--${boundary}`);
  rawMessage.push(`Content-Type: text/html; charset=UTF-8`);
  rawMessage.push(`Content-Transfer-Encoding: 7bit`);
  rawMessage.push(``);
  rawMessage.push(htmlMessage || message);
  rawMessage.push(``);

  // 3. Agregar los archivos adjuntos si existen
  if (attachments && Array.isArray(attachments)) {
    for (const file of attachments) {
      // file.filename -> Ej: "receta-medica.pdf"
      // file.content -> El archivo codificado en Base64
      // file.contentType -> Ej: "application/pdf"
      
      rawMessage.push(`--${boundary}`);
      rawMessage.push(`Content-Type: ${file.contentType || "application/octet-stream"}; name="${file.filename}"`);
      rawMessage.push(`Content-Transfer-Encoding: base64`);
      rawMessage.push(`Content-Disposition: attachment; filename="${file.filename}"`);
      rawMessage.push(``);
      
      // Dividir el contenido base64 en líneas de 76 caracteres (estándar MIME)
      const base64Chunked = file.content.match(/.{1,76}/g).join("\r\n");
      rawMessage.push(base64Chunked);
      rawMessage.push(``);
    }
  }

  // Cerrar el boundary
  rawMessage.push(`--${boundary}--`);

  // Convertir todo el texto plano a un Buffer crudo requerido por SendRawEmail
  const rawEmailString = rawMessage.join("\r\n");
  const rawEmailBuffer = Buffer.from(rawEmailString);

  const params = {
    RawMessage: {
      Data: rawEmailBuffer,
    },
  };

  const command = new SendRawEmailCommand(params);
  const response = await sesClient.send(command);

  return responder(200,{
      success: true,
      canal: "email",
      messageId: response.MessageId,
      detalle: "Correo con adjuntos enviado exitosamente.",
    }); 
}

async function manejarSms(body) {
  const { telefono, mensaje } = body;

  if (!telefono || !mensaje) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Faltan parámetros para SMS: 'telefono' y 'mensaje'." }),
    };
  }

  // TODO: Aquí integras tu lógica de AWS SNS o proveedor de SMS
  console.log(`Enviando SMS a ${telefono}: ${mensaje}`);

  return responder(200,{
      success: true,
      canal: "sms",
      detalle: "SMS procesado correctamente (simulado o integrado con SNS).",
    });
}

async function manejarWhatsapp(body) {
  const { telefono, mensaje, templateData } = body;

  if (!telefono || !mensaje) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Faltan parámetros para WhatsApp: 'telefono' y 'mensaje'." }),
    };
  }

  // TODO: Aquí integras la API de Meta (WhatsApp Business) o proveedor externo (Twilio, etc.)
  console.log(`Enviando WhatsApp a ${telefono}: ${mensaje}`);

  return responder(200,{
      success: true,
      canal: "whatsapp",
      detalle: "Mensaje de WhatsApp procesado correctamente.",
    });
}