variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Región de AWS"
}

variable "project_name" {
  type        = string
  description = "Nombre del proyecto (ej: pediatria, finanzas)"
}

variable "environment" {
  type        = string
  default     = "dev"
  description = "Entorno de ejecución (dev, staging, production)"
}
variable "function_name" {
  type        = string
  default     = "lmb-notificaciones"
  description = "nombre de la lambda"
}

variable "dynamodb_tables_json" {
  type        = string
  description = "JSON string con la lista de tablas de DynamoDB enviado desde GitHub"
}
# Se usa únicamente para configurarla dentro de la Lambda

variable "runtime" {
  type        = string
  description = "runtime de la lambda"
  default = "nodejs22.x"
}
variable "twilio_account_sid" {
  type      = string
  sensitive = true
}

variable "twilio_auth_token" {
  type      = string
  sensitive = true
}

variable "twilio_whatsapp_number" {
  type = string
}
variable "twilio_sms_number" {
  type = string
}

variable "twilio_api_url" {
  type = string
}

