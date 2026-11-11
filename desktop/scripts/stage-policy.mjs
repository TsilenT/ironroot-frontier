// Use a conservative ASCII naming policy on every build host, including
// rejection of Windows device names and case collisions.
export function assertPortableNames(files) {
  const folded = new Set();
  for (const name of files) {
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(name) || /[.]$/.test(name) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:[.]|$)/i.test(name))
      throw new Error(`Runtime filename violates the desktop portability policy: ${name}`);
    const key = name.toLowerCase();
    if (folded.has(key)) throw new Error(`Runtime filenames collide on Windows: ${name}`);
    folded.add(key);
  }
}
