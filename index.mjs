// Método centralizado para responder con CORS, status code y body formateado
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
    // 1. Cargamos las credenciales y URLs compartidas
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioApiUrl = process.env.TWILIO_API_URL;
    
    // Números específicos para cada canal
    const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    const twilioSmsNumber = process.env.TWILIO_SMS_NUMBER;

    if (!accountSid || !authToken || !twilioApiUrl) {
        return responder(500, { success: false, error: 'Faltan credenciales base de Twilio en las variables de entorno.' });
    }

    // 2. Identificamos por qué path llegó la petición desde API Gateway
    const rawPath = event.rawPath || event.path || '';
    
    // Validamos qué tipo de notificación es
    const isWhatsApp = rawPath.includes('whatsapp');
    const isSms = rawPath.includes('sms');

    if (!isWhatsApp && !isSms) {
        return responder(400, { success: false, error: 'Ruta no válida. Usa /notificaciones/whatsapp o /notificaciones/sms' });
    }

    // 3. Parseamos los datos del cuerpo de la petición
    let bodyData;
    try {
        bodyData = typeof event.body === 'string' ? JSON.parse(event.body) : event;
    } catch (e) {
        return responder(400, { success: false, error: 'El body de la petición no es un JSON válido.' });
    }

    const telefonoDestino = bodyData.telefono;
    const mensaje = bodyData.mensaje;

    if (!telefonoDestino || !mensaje) {
        return responder(400, { success: false, error: 'Faltan los campos "telefono" o "mensaje" en el body.' });
    }

    // 4. Preparamos los parámetros de Twilio según el canal
    let fromNumber = '';
    let finalTelefono = '';

    if (isWhatsApp) {
        if (!twilioWhatsAppNumber) {
            return responder(500, { success: false, error: 'Falta configurar TWILIO_WHATSAPP_NUMBER' });
        }
        fromNumber = twilioWhatsAppNumber;
        finalTelefono = `whatsapp:${telefonoDestino}`;
    } else {
        if (!twilioSmsNumber) {
            return responder(500, { success: false, error: 'Falta configurar TWILIO_SMS_NUMBER' });
        }
        fromNumber = twilioSmsNumber;
        finalTelefono = telefonoDestino;
    }

    // 5. Autenticación HTTP Basic y envío a la API de Twilio
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const twilioBody = new URLSearchParams({
        From: fromNumber,
        To: finalTelefono,
        Body: mensaje
    });

    const endpoint = `${twilioApiUrl}/${accountSid}/Messages.json`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: twilioBody
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error al enviar notificación a través de Twilio');
        }
        
        return responder(200, { 
            success: true, 
            canal: isWhatsApp ? 'whatsapp' : 'sms', 
            sid: data.sid 
        });
    } catch (error) {
        return responder(500, { success: false, error: error.message });
    }
};