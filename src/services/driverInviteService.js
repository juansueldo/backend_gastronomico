import crypto from 'node:crypto';
import bcrypt from 'bcrypt';

const PIN_LENGTH = 6;
const INVITE_TTL_HOURS = 72;

function addHours(date, hours) {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

function createPin() {
  const max = 10 ** PIN_LENGTH;
  return String(crypto.randomInt(0, max)).padStart(PIN_LENGTH, '0');
}

class DriverInviteService {
  static async regenerateInvite(driver) {
    const inviteCode = createPin();
    const inviteCodeHash = await bcrypt.hash(inviteCode, 10);
    const inviteCodeExpiresAt = addHours(new Date(), INVITE_TTL_HOURS);

    await driver.update({
      inviteCodeHash,
      inviteCodeExpiresAt,
      mobileSessionVersion: Number(driver.mobileSessionVersion ?? 0) + 1,
    });

    return {
      inviteCode,
      inviteCodeExpiresAt,
      driver,
    };
  }

  static isInviteExpired(driver) {
    if (!driver?.inviteCodeExpiresAt) return true;
    return new Date(driver.inviteCodeExpiresAt).getTime() < Date.now();
  }

  static async verifyInvite(driver, inviteCode) {
    if (!driver?.inviteCodeHash || this.isInviteExpired(driver)) return false;
    return bcrypt.compare(String(inviteCode || '').trim(), driver.inviteCodeHash);
  }
}

export default DriverInviteService;
