using DumpAnalyzerApi_New.ClassMapping;
using DumpAnalyzerApi_New.ClassMappingParsers;
using DumpAnalyzerApi_New.DocumentParsers;
using DumpAnalyzerApi_New.ObjectPathExtractor;
using Microsoft.Diagnostics.Runtime;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

var pre_test = ClassMapping.Classes;

var classMappingData = ClassMappingJsonParser.ParseJsonToClassMappingFromFile("./configs/class_mapping.json");
ClassMapping.PopulateClassMapping(classMappingData);

var test = ClassMapping.Classes;

var relationMappingData = RelationDefinationParser.ParseJsonToRelationMappingFromFile("./configs/relation_mapping.json");

//Now we have relation Mapping and Class Mapping, Time to make Relations using it


string dumpFilePath = "D:\\SampleDumpProject.DMP";

using var target = DataTarget.LoadDump(dumpFilePath);
using var runtime = target.ClrVersions.First().CreateRuntime();

var objectExtractor = new ObjectExtractor(runtime);

var clrObjectTest = objectExtractor.GetObject(relationMappingData.First().Value);
//var heap = runtime.Heap;


app.Run();
