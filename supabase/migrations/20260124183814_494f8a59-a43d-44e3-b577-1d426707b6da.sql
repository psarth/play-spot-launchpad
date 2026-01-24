-- Create storage bucket for QR code images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-qr-codes', 'payment-qr-codes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for QR codes
CREATE POLICY "Anyone can view QR codes"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-qr-codes');

CREATE POLICY "Providers can upload QR codes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-qr-codes' 
  AND has_role(auth.uid(), 'provider'::app_role)
);

CREATE POLICY "Providers can update their QR codes"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'payment-qr-codes'
  AND has_role(auth.uid(), 'provider'::app_role)
);

CREATE POLICY "Providers can delete their QR codes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'payment-qr-codes'
  AND has_role(auth.uid(), 'provider'::app_role)
);