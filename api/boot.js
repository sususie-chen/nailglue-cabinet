// 占位符：npm run build 时会被 esbuild 生成的真正代码覆盖
export default () => new Response("Server booting...", { status: 503 });