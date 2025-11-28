-- Add marketing email templates

-- Insert newsletter template
INSERT INTO public.email_templates (name, subject, body_html, body_text, is_active, created_at)
VALUES (
    'newsletter',
    'BLINNO Newsletter - {{month}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BLINNO Newsletter</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">BLINNO</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Newsletter - {{month}}</p>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #667eea;">Hello {{userName}}!</h2>
        
        <p>We''re excited to share the latest updates and features from BLINNO:</p>
        
        <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea;">
            <h3 style="margin-top: 0; color: #667eea;">✨ What''s New</h3>
            <ul style="padding-left: 20px;">
                <li>New features to help you grow your business</li>
                <li>Improved dashboard experience</li>
                <li>Better payment processing</li>
                <li>Enhanced creator tools</li>
            </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://www.blinno.app" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Explore Now</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #666; font-size: 12px; text-align: center;">
            You''re receiving this because you''re a registered user of BLINNO.<br>
            <a href="https://www.blinno.app/unsubscribe?email={{userEmail}}" style="color: #667eea;">Unsubscribe</a> | 
            <a href="https://www.blinno.app" style="color: #667eea;">Visit BLINNO</a>
        </p>
    </div>
</body>
</html>',
    'BLINNO Newsletter - {{month}}

Hello {{userName}}!

We''re excited to share the latest updates and features from BLINNO:

✨ What''s New
- New features to help you grow your business
- Improved dashboard experience
- Better payment processing
- Enhanced creator tools

Explore Now: https://www.blinno.app

---
You''re receiving this because you''re a registered user of BLINNO.
Unsubscribe: https://www.blinno.app/unsubscribe?email={{userEmail}}
Visit BLINNO: https://www.blinno.app',
    true,
    NOW()
)
ON CONFLICT (name) DO UPDATE SET
    subject = EXCLUDED.subject,
    body_html = EXCLUDED.body_html,
    body_text = EXCLUDED.body_text,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Insert feature announcement template
INSERT INTO public.email_templates (name, subject, body_html, body_text, is_active, created_at)
VALUES (
    'feature_announcement',
    '🎉 New Feature: {{featureName}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Feature Announcement</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">🎉 New Feature!</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #667eea;">Hello {{userName}}!</h2>
        
        <p>We''re thrilled to announce a new feature that will make your experience even better:</p>
        
        <div style="background: white; padding: 25px; margin: 20px 0; border-radius: 8px; border: 2px solid #667eea;">
            <h3 style="margin-top: 0; color: #667eea;">{{featureName}}</h3>
            <p>{{featureDescription}}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{featureUrl}}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Try It Now</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #666; font-size: 12px; text-align: center;">
            You''re receiving this because you''re a registered user of BLINNO.<br>
            <a href="https://www.blinno.app/unsubscribe?email={{userEmail}}" style="color: #667eea;">Unsubscribe</a>
        </p>
    </div>
</body>
</html>',
    '🎉 New Feature: {{featureName}}

Hello {{userName}}!

We''re thrilled to announce a new feature that will make your experience even better:

{{featureName}}
{{featureDescription}}

Try It Now: {{featureUrl}}

---
You''re receiving this because you''re a registered user of BLINNO.
Unsubscribe: https://www.blinno.app/unsubscribe?email={{userEmail}}',
    true,
    NOW()
)
ON CONFLICT (name) DO UPDATE SET
    subject = EXCLUDED.subject,
    body_html = EXCLUDED.body_html,
    body_text = EXCLUDED.body_text,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Insert promotional template
INSERT INTO public.email_templates (name, subject, body_html, body_text, is_active, created_at)
VALUES (
    'promotional',
    '🎁 Special Offer: {{promoTitle}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Special Offer</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">🎁 Special Offer</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #f5576c;">Hello {{userName}}!</h2>
        
        <p>We have an exclusive offer just for you:</p>
        
        <div style="background: white; padding: 25px; margin: 20px 0; border-radius: 8px; border: 2px dashed #f5576c; text-align: center;">
            <h3 style="margin-top: 0; color: #f5576c;">{{promoTitle}}</h3>
            <p style="font-size: 18px; font-weight: bold; color: #f5576c;">{{promoDescription}}</p>
            {{#if promoCode}}
            <div style="background: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 5px;">
                <p style="margin: 0; font-size: 14px; color: #666;">Use code:</p>
                <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #f5576c; letter-spacing: 2px;">{{promoCode}}</p>
            </div>
            {{/if}}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{promoUrl}}" style="background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Claim Offer</a>
        </div>
        
        <p style="color: #666; font-size: 12px;">{{promoTerms}}</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #666; font-size: 12px; text-align: center;">
            You''re receiving this because you''re a registered user of BLINNO.<br>
            <a href="https://www.blinno.app/unsubscribe?email={{userEmail}}" style="color: #667eea;">Unsubscribe</a>
        </p>
    </div>
</body>
</html>',
    '🎁 Special Offer: {{promoTitle}}

Hello {{userName}}!

We have an exclusive offer just for you:

{{promoTitle}}
{{promoDescription}}

{{#if promoCode}}
Use code: {{promoCode}}
{{/if}}

Claim Offer: {{promoUrl}}

{{promoTerms}}

---
You''re receiving this because you''re a registered user of BLINNO.
Unsubscribe: https://www.blinno.app/unsubscribe?email={{userEmail}}',
    true,
    NOW()
)
ON CONFLICT (name) DO UPDATE SET
    subject = EXCLUDED.subject,
    body_html = EXCLUDED.body_html,
    body_text = EXCLUDED.body_text,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

COMMENT ON TABLE public.email_templates IS 'Email templates for marketing and transactional emails';

