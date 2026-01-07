export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export function generateSignatureHash(
  packetJson: string,
  operatorId: string,
  passphrase: string,
  timestamp: string
): Promise<string> {
  const combined = `${packetJson}${operatorId}${passphrase}${timestamp}`;
  return sha256(combined);
}

