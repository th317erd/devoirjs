module.exports = function() {
	return {
		include: ['^lib/(data|deferred|utils)\.js$'],
		extensions: ['js'],
		inputPath: './',
		outputPath: '../devoirjs.wiki'
	};
};
