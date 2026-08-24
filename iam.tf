# Rol base que permite a AWS activar la función Lambda
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-${var.function_name}-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Política personalizada para permitir el envío de correos vía SES
resource "aws_iam_policy" "lambda_ses_policy" {
  name        = "${var.project_name}-lambda-ses-policy-${var.environment}"
  description = "Permite a la Lambda enviar correos usando Amazon SES"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "${var.arn_ses}"
        # Opcional (más seguro): Puedes restringir el Resource al ARN específico de tu identidad SES de dominio
      }
    ]
  })
}

# Adjuntar la política de SES al rol de la Lambda
resource "aws_iam_role_policy_attachment" "lambda_ses_attachment" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_ses_policy.arn
}

# Adjuntar política para que la Lambda guarde logs en CloudWatch
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# 🔍 Obtiene dinámicamente los datos de la cuenta de AWS activa
data "aws_caller_identity" "current" {}



