import path from 'path'
import klaw from 'klaw'
import { unlink } from 'node:fs/promises'
import { BuildOutput, BunFile } from 'bun'

const find_scripts = (results: BuildOutput, end_marker: string): string => {
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

const copy = async (src: string, dst: string, callback: undefined | ((file: BunFile) => Promise<Blob | string>) = undefined) => {
    const file = Bun.file(src)
    const data = callback === undefined ? file : await callback(file)
    Bun.write(dst, data)
}

(async () => {
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
        naming: "[dir]/[name]-[hash].[ext]",
        outdir: output,
        minify: true,
        splitting: true,
        target: 'browser'
    })

    if (!results.success) {
        console.error('❌ bun build failed:');
        console.error(results.logs.join('\n'));
        return process.exit(1);
    }

    console.log('🤖 bun build completed');

    try {
        const marker = '<!-- %SCRIPT_REPLACE_MARKER% -->'
        const scripts = find_scripts(results, `\t${marker}`)

        await copy('./favicon.ico', `${output}/favicon.ico`)
        await copy('./app/index.html', `${output}/index.html`, async (file) => {
            const text = await file.text()
            return text.replace(marker, scripts)
        })
        console.log('📁 static files copied');
    } catch (error) {
        console.error('❌ static files copy failed', error);
        return process.exit(1);
    }

    console.log('✅ build succeeded');
})();