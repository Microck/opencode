import path from "path"
import { Glob } from "@/util/glob"
import { Filesystem } from "@/util/filesystem"
import { Global } from "@/global"
import { Instance } from "@/project/instance"

const exts = "{ts,tsx,js,jsx,mts,mtsx,mjs,cts,ctsx,cjs}"
const pats = [`extensions/*.${exts}`, `extensions/*/index.${exts}`]

async function scan(root: string) {
  const out = await Promise.all(
    pats.map((pat) =>
      Glob.scan(pat, {
        cwd: root,
        absolute: true,
        include: "file",
        symlink: true,
        dot: true,
      }),
    ),
  )
  return out.flat().toSorted((a, b) => a.localeCompare(b))
}

export namespace OpiLoader {
  export async function discover(input?: { global?: string[]; local?: string[] }) {
    const global = input?.global ?? [Global.Path.config]
    const local =
      input?.local ??
      (await Array.fromAsync(
        Filesystem.up({
          targets: [".opi"],
          start: Instance.directory,
          stop: Instance.worktree,
        }),
      )).toReversed()

    const out: string[] = []
    const seen = new Set<string>()

    for (const root of [...global, ...local]) {
      for (const file of await scan(root)) {
        const key = path.normalize(file)
        if (seen.has(key)) continue
        seen.add(key)
        out.push(file)
      }
    }

    return out
  }
}
