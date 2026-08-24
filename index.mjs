// Método centralizado para responder con CORS, status code y body formateado
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
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
    // 1. Extraemos los datos del evento (pueden venir de un API Gateway, SQS o invocación directa)
    // Si viene de API Gateway HTTP/REST, el body suele estar en event.body (parseado o como string)
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event;
    const { to, subject, message, htmlMessage } = body;

    if (!to || !subject || (!message && !htmlMessage)) {
      return responder(400,{ error: "Faltan parámetros requeridos: 'to', 'subject' y 'message' (o 'htmlMessage')." });
    }

    // 2. Definimos el correo remitente verificado en SES
    // Asegúrate de usar el dominio o correo que verificaste (ej: no-reply@dev.docfy.shop)
    const senderEmail = process.env.SENDER_EMAIL || "no-reply@dev.docfy.shop";

    // 3. Preparamos el comando para SES
    const params = {
      Source: senderEmail,
      Destination: {
        ToAddresses: Array.isArray(to) ? to : [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          // Puedes enviar texto plano, HTML o ambos
          ...(message && {
            Text: {
              Data: message,
              Charset: "UTF-8",
            },
          }),
          ...(htmlMessage && {
            Html: {
              Data: htmlMessage,
              Charset: "UTF-8",
            },
          }),
        },
      },
    };

    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);

    console.log("Correo enviado con éxito. MessageId:", response.MessageId);

    return (200,{
        success: true,
        message: "Correo enviado correctamente.",
        messageId: response.MessageId,
      });
    
  } catch (error) {
    console.error("Error al enviar el correo con SES:", error);
    responder(500,{
        success: false,
        error: error.message,
      });
  }
    
};