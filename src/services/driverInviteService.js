import crypto from 'node:crypto';
import bcrypt from 'bcrypt';

const PIN_LENGTH = 6;

function createPin() {
  const max = 10 ** PIN_LENGTH;
  return String(crypto.randomInt(0, max)).padStart(PIN_LENGTH, '0');
}

class DriverInviteService {
  static async regenerateInvite(driver) {
    const inviteCode = createPin();
    const inviteCodeHash = await bcrypt.hash(inviteCode, 10);

    await driver.update({
      inviteCodeHash,
      inviteCodeExpiresAt: null,
      mobileSessionVersion: Number(driver.mobileSessionVersion ?? 0) + 1,
    });

    return {
      inviteCode,
      inviteCodeExpiresAt: null,
      driver,
    };
  }

  static isInviteExpired(driver) {
    return false;
  }

  static async verifyInvite(driver, inviteCode) {
    if (!driver?.inviteCodeHash || this.isInviteExpired(driver)) return false;
    return bcrypt.compare(String(inviteCode || '').trim(), driver.inviteCodeHash);
  }
}

export default DriverInviteService;
