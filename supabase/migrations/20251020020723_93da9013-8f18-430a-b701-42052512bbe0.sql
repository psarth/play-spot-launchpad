-- Add 'admin' role to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'admin';

-- Add foreign key from bookings to profiles
ALTER TABLE bookings 
ADD CONSTRAINT bookings_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;