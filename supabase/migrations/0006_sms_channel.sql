-- 0006_sms_channel.sql
-- Add an 'sms' value to notification_channel so the reminder engine can send
-- automated text messages (e.g. via a Philippine SMS provider like Semaphore).
-- ADD VALUE runs outside a transaction and is idempotent.

alter type notification_channel add value if not exists 'sms';
