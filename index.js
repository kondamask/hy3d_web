async function init() {
	const adapter = await navigator.gpu.requestAdapter();
	if (!adapter) {
		throw Error("Couldn't request WebGPU adapter.");
	}

	const device = await adapter.requestDevice();

	const shaders = `
	struct VertexOut {
	  @builtin(position) position : vec4f,
	  @location(0) color : vec4f
	}
	
	@vertex
	fn vertex_main(@location(0) position: vec4f,
				   @location(1) color: vec4f) -> VertexOut
	{
	  var output : VertexOut;
	  output.position = position;
	  output.color = color;
	  return output;
	}
	
	@fragment
	fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
	{
	  return fragData.color;
	}
	`;

	const shaderModule = device.createShaderModule({
		code: shaders,
	});

	const canvas = document.getElementById("canvas");
	const context = canvas.getContext("webgpu");

	context.configure({
		device: device,
		format: navigator.gpu.getPreferredCanvasFormat(),
		alphaMode: "premultiplied",
	});

	// 2*vec4: pos, color
	const vertices = new Float32Array([
    // X,  Y, Z  R, G, B, A,
       0,  1, 1, 1, 0, 0, 1,
      -1, -1, 1, 0, 1, 0, 1,
       1, -1, 1, 0, 0, 1, 1,
	]);
	const vertexBuffer = device.createBuffer({
		size: vertices.byteLength, // make it big enough to store vertices in
		usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
	});

	device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);

	const vertexBuffers = [
		{
			attributes: [
				{
					shaderLocation: 0, // position
					offset: 0,
					format: "float32x3",
				},
				{
					shaderLocation: 1, // color
					offset: 12,
					format: "float32x4",
				},
			],
			arrayStride: 28,
			stepMode: "vertex",
		},
	];

	const pipelineDescriptor = {
		vertex: {
			module: shaderModule,
			entryPoint: "vertex_main",
			buffers: vertexBuffers,
		},
		fragment: {
			module: shaderModule,
			entryPoint: "fragment_main",
			targets: [
				{
					format: navigator.gpu.getPreferredCanvasFormat(),
				},
			],
		},
		primitive: {
			topology: "triangle-list",
		},
		layout: "auto",
	};

	const renderPipeline = device.createRenderPipeline(pipelineDescriptor);

	const commandEncoder = device.createCommandEncoder();

	const renderPassDescriptor = {
		colorAttachments: [
			{
				clearValue: [0, 0, 0.2, 1],
				loadOp: "clear",
				storeOp: "store",
				view: context.getCurrentTexture().createView(),
			},
		],
	};

	const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
	passEncoder.setPipeline(renderPipeline);
	passEncoder.setVertexBuffer(0, vertexBuffer);
	passEncoder.draw(3);
	passEncoder.end();

	device.queue.submit([commandEncoder.finish()]);



	console.info("END");
}

if (navigator.gpu) {
	init();
} else {
	console.log('WebGPU not supported');
}

