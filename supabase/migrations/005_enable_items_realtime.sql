-- Enable realtime for items table so frontend can subscribe to changes
ALTER PUBLICATION supabase_realtime ADD TABLE items;
