-- Add area_category column to items table
ALTER TABLE items ADD COLUMN area_category VARCHAR(50);

-- Add index for area_category lookups
CREATE INDEX idx_items_area_category ON items(area_category);

-- Add 'suggestion' to notification type check constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('message', 'claim', 'resolved', 'complaint', 'system', 'suggestion'));

-- Add function to find matching found items for a lost item
CREATE OR REPLACE FUNCTION find_matching_found_items(
  p_category VARCHAR(50),
  p_area_category VARCHAR(50),
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_exclude_item_id UUID
)
RETURNS TABLE(
  id UUID,
  name VARCHAR(200),
  location VARCHAR(200),
  image_url VARCHAR(500),
  coordinates_lat NUMERIC,
  coordinates_lng NUMERIC,
  distance_meters NUMERIC,
  reporter UUID,
  reported_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.name,
    i.location,
    i.image_url,
    i.coordinates_lat,
    i.coordinates_lng,
    CASE 
      WHEN i.coordinates_lat IS NOT NULL AND i.coordinates_lng IS NOT NULL 
       AND p_lat IS NOT NULL AND p_lng IS NOT NULL
      THEN (
        6371000 * 2 * ASIN(SQRT(
          POWER(SIN(RADIANS(i.coordinates_lat - p_lat) / 2), 2) +
          COS(RADIANS(p_lat)) * COS(RADIANS(i.coordinates_lat)) *
          POWER(SIN(RADIANS(i.coordinates_lng - p_lng) / 2), 2)
        ))
      )
      ELSE NULL
    END AS distance_meters,
    i.reporter,
    i.reported_at
  FROM items i
  WHERE i.type = 'found'
    AND i.status = 'Available'
    AND i.id != p_exclude_item_id
    AND i.category = p_category
    AND (
      (p_area_category IS NOT NULL AND i.area_category = p_area_category)
      OR (p_area_category IS NULL AND i.area_category IS NULL)
    )
  ORDER BY distance_meters ASC NULLS LAST
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
