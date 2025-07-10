from django.core.mail import send_mail
from django.urls import reverse
from django.conf import settings
from departments.models import Department

def send_student_verification_email(student):
    try:
        student_email = student.email  # assuming OneToOne relation with auth user
        department = Department.objects.filter(department_id=student.department_id,is_deleted=False).first()
        department_name = department.name if department else "Unknown"

        verification_link = f"{settings.SITE_DOMAIN}{reverse('students:student-verify', kwargs={'student_id': student.student_id})}"
        subject = "Confirm Your Student Enrollment"
        message = (
            f"Hello {student.name},\n\n"
            f"You have been added as a student in the department '{department_name}'.\n"
            f"Please click the button below to confirm your enrollment.\n\n"
            f"{verification_link}"
        )

        html_message = f"""
            <html>
                <body style="font-family: Arial, sans-serif; background-color: #f8f6fc; padding: 20px; color: #333;">
                    <div style="max-width: 600px; margin: auto; background-color: #fff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.05); padding: 30px;">

                        <!-- Header image -->
                        
                        <h2 style="color: #6a0dad;">Welcome to {department_name} Department</h2>

                        <p>Dear <strong>{student.name}</strong>,</p>

                        <p>
                            You have been added as a student in the <strong>{department_name}</strong> department. 
                            We're excited to have you on board!
                        </p>

                        <p style="margin-top: 30px;">Please click the button below to confirm your enrollment:</p>

                        <div style="text-align: center; margin: 20px 0;">
                            <a href="{verification_link}" 
                            style="padding: 12px 25px; background-color: #6a0dad; color: white; 
                                    text-decoration: none; border-radius: 6px; font-weight: bold;">
                            Confirm Enrollment
                            </a>
                        </div>

                        <p>If you did not expect this invitation, you can safely ignore this email.</p>

                        <p style="margin-top: 40px;">Best regards,<br>
                        <em>The Redlitmus Team</em></p>
                    </div>
                </body>
            </html>
            """

        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [student_email],
            html_message=html_message
        )
    except Exception as e:
        print("Error sending email:", str(e))

# def verification_success_response():
#     return HttpResponse(
#         """
#         <!DOCTYPE html>
#         <html lang="en">
#         <head>
#             <meta charset="UTF-8">
#             <title>Verification Successful</title>
#             <style>
#                 body {
#                     font-family: "Segoe UI", sans-serif;
#                     background-color: #f9f9f9;
#                     color: #333;
#                     text-align: center;
#                     padding: 80px 20px;
#                 }
#                 .container {
#                     max-width: 500px;
#                     margin: auto;
#                     background: white;
#                     border-radius: 12px;
#                     padding: 40px;
#                     box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
#                 }
#                 h1 {
#                     color: #28a745;
#                     margin-bottom: 20px;
#                 }
#                 p {
#                     font-size: 18px;
#                 }
#                 .login-link {
#                     margin-top: 20px;
#                     display: inline-block;
#                     background-color: #007bff;
#                     color: white;
#                     padding: 10px 18px;
#                     border-radius: 6px;
#                     text-decoration: none;
#                 }
#                 .login-link:hover {
#                     background-color: #0056b3;
#                 }
#             </style>
#         </head>
#         <body>
#             <div class="container">
#                 <h1>Verification Successful!</h1>
#                 <p>Your account has been successfully verified.</p>
#                 <a class="login-link" href="/login/">Login Now</a>
#             </div>
#         </body>
#         </html>
#         """,
#         content_type="text/html"
#     )