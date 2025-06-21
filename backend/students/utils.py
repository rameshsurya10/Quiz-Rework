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
        <body>
            <p>Hello {student.name},</p>
            <p>You have been added as a student in the department <strong>{department_name}</strong>.</p>
            <p>Please click the button below to confirm your enrollment:</p>
            <a href="{verification_link}" 
               style="padding: 10px 15px; background-color: #4CAF50; color: white; 
                      text-decoration: none; border-radius: 5px;">
               Verify
            </a>
            <p>If you did not expect this, please ignore this email.</p>
            <p>Best regards,<br>
            <em>Redlitmus teams</em></p>
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