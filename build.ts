import path from 'path'
import klaw from 'klaw'
import { unlink } from 'node:fs/promises'

const output = './dist'

klaw(output, { depthLimit: 0 })
    .on('data', async data => {
        if (data.stats.isDirectory()) {
            return
        }
        await unlink(data.path)
    })

const results = await Bun.build({
    entrypoints: ['./app/index.ts'],
    outdir: output,
    minify: true,
    splitting: true,
    target: 'browser',
})

const marker = '<!-- %SCRIPT_REPLACE_MARKER% -->'
const scripts = find_scripts(results, `\t${marker}`)

await copy('./favicon.ico', `${output}/favicon.ico`)
await copy('./app/index.html', `${output}/index.html`, async (file) => {
    const text = await file.text()
    return text.replace(marker, scripts)
})

console.log(results.success)
if (!results.success) {
    for (const log of results.logs) {
        console.log(log)
    }
}
export { }

function find_scripts(results: BuildOutput, end_marker: string): string {
    let scripts = ""
    for (const result of results.outputs) {
        const filename = path.basename(result.path)
        if (filename.endsWith('.css')) {
            scripts += '\r\n'
            scripts += `\t<link rel="stylesheet" href="${filename}">`
        } else if (filename.endsWith('.js')) {
            scripts += '\r\n'
            scripts += `\t<script src="${filename}"></script>`
        }
    }
    scripts += '\r\n'
    scripts += end_marker
    return scripts
}

async function copy(src: string, dst: string, callback: undefined | ((file: BunFile) => Promise<Blob | string>) = undefined) {
    const file = Bun.file(src)
    const data = callback === undefined ? file : await callback(file)
    Bun.write(dst, data)
}