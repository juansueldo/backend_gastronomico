import { DeliveryZone, Headquarter } from '../models/index.js';

function getStringValue(value) {
  if (typeof value !== 'string') return null;
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function resolveLocalityName(zone) {
  const metadata = zone.metadata && typeof zone.metadata === 'object' ? zone.metadata : {};

  return (
    getStringValue(metadata.locality) ||
    getStringValue(metadata.localidad) ||
    getStringValue(metadata.city) ||
    getStringValue(metadata.municipality) ||
    getStringValue(zone.name) ||
    'Sin localidad'
  );
}

class LocalityController {
  static async getByStore(req, res) {
    try {
      const storeId = req.user?.storeId;
      const headquarterId = req.query.headquarterId ? Number(req.query.headquarterId) : null;
      const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true';

      if (!storeId) {
        return res.status(401).json({ error: 'storeId no encontrado en el token' });
      }

      if (headquarterId !== null && (!Number.isInteger(headquarterId) || headquarterId <= 0)) {
        return res.status(400).json({ error: 'headquarterId debe ser un entero válido' });
      }

      const where = {
        storeId,
        ...(includeInactive ? {} : { statusId: 1 }),
        ...(headquarterId ? { headquarterId } : {}),
      };

      const zones = await DeliveryZone.findAll({
        where,
        include: [{ model: Headquarter, attributes: ['id', 'name', 'location'] }],
        order: [['name', 'ASC']],
      });

      const localityMap = new Map();

      for (const zone of zones) {
        const localityName = resolveLocalityName(zone);
        const normalizedKey = localityName.toLowerCase();
        const existingLocality = localityMap.get(normalizedKey);

        const zoneData = {
          id: zone.id,
          name: zone.name,
          zoneid: zone.zoneid,
          headquarterId: zone.headquarterId,
          headquarter: zone.Headquarter
            ? {
                id: zone.Headquarter.id,
                name: zone.Headquarter.name,
                location: zone.Headquarter.location,
              }
            : null,
        };

        if (!existingLocality) {
          localityMap.set(normalizedKey, {
            locality: localityName,
            zones: [zoneData],
          });
          continue;
        }

        existingLocality.zones.push(zoneData);
      }

      const localities = Array.from(localityMap.values())
        .map((item) => ({
          locality: item.locality,
          zoneCount: item.zones.length,
          zones: item.zones,
        }))
        .sort((a, b) => a.locality.localeCompare(b.locality, 'es'));

      return res.status(200).json({
        count: localities.length,
        filters: {
          headquarterId: headquarterId || null,
          includeInactive,
        },
        localities,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }
}

export default LocalityController;
