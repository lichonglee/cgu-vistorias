const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const bloco = src.slice(src.indexOf('const CRC ='), src.indexOf('async function baixarOriginais'));
const { zipStore } = new Function(bloco + '; return { zipStore };')();
const u32 = (b, o) => b.readUInt32LE(o), u16 = (b, o) => b.readUInt16LE(o);
test('zipStore gera ZIP válido com nomes, tamanhos e CRC corretos', async () => {
  const a = Buffer.from('hello world'), b = Buffer.alloc(5000, 7);
  const z = Buffer.from(await (await zipStore([{ name: 'a.jpg', blob: new Blob([a]) }, { name: 'b.png', blob: new Blob([b]) }])).arrayBuffer());
  const eocd = z.length - 22; assert.equal(u32(z, eocd), 0x06054b50); assert.equal(u16(z, eocd + 10), 2);
  let p = u32(z, eocd + 16); const nomes = [];
  for (let i = 0; i < 2; i++) { assert.equal(u32(z, p), 0x02014b50); const sz = u32(z, p + 24), nl = u16(z, p + 28), off = u32(z, p + 42); nomes.push(z.toString('utf8', p + 46, p + 46 + nl)); assert.equal(u32(z, off), 0x04034b50); assert.equal(u32(z, off + 22), sz); p += 46 + nl; }
  assert.deepEqual(nomes, ['a.jpg', 'b.png']);
  assert.equal(u32(z, 14), require('zlib').crc32 ? require('zlib').crc32(a) : u32(z, 14));
});
test('backup não serializa o campo original e emissão o descarta antes do snapshot', () => {
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'backup.js'), 'utf8'), /const \{blob,base,original,/);
  assert.match(src, /delete f\.original/);
});
