// Do not edit this file; automatically generated by build.py.
'use strict';


Blockly.Python=new Blockly.Generator("Python");Blockly.Python.addReservedWords("False,None,True,and,as,assert,break,class,continue,def,del,elif,else,except,exec,finally,for,from,global,if,import,in,is,lambda,nonlocal,not,or,pass,print,raise,return,try,while,with,yield,NotImplemented,Ellipsis,__debug__,quit,exit,copyright,license,credits,ArithmeticError,AssertionError,AttributeError,BaseException,BlockingIOError,BrokenPipeError,BufferError,BytesWarning,ChildProcessError,ConnectionAbortedError,ConnectionError,ConnectionRefusedError,ConnectionResetError,DeprecationWarning,EOFError,Ellipsis,EnvironmentError,Exception,FileExistsError,FileNotFoundError,FloatingPointError,FutureWarning,GeneratorExit,IOError,ImportError,ImportWarning,IndentationError,IndexError,InterruptedError,IsADirectoryError,KeyError,KeyboardInterrupt,LookupError,MemoryError,ModuleNotFoundError,NameError,NotADirectoryError,NotImplemented,NotImplementedError,OSError,OverflowError,PendingDeprecationWarning,PermissionError,ProcessLookupError,RecursionError,ReferenceError,ResourceWarning,RuntimeError,RuntimeWarning,StandardError,StopAsyncIteration,StopIteration,SyntaxError,SyntaxWarning,SystemError,SystemExit,TabError,TimeoutError,TypeError,UnboundLocalError,UnicodeDecodeError,UnicodeEncodeError,UnicodeError,UnicodeTranslateError,UnicodeWarning,UserWarning,ValueError,Warning,ZeroDivisionError,_,__build_class__,__debug__,__doc__,__import__,__loader__,__name__,__package__,__spec__,abs,all,any,apply,ascii,basestring,bin,bool,buffer,bytearray,bytes,callable,chr,classmethod,cmp,coerce,compile,complex,copyright,credits,delattr,dict,dir,divmod,enumerate,eval,exec,execfile,exit,file,filter,float,format,frozenset,getattr,globals,hasattr,hash,help,hex,id,input,int,intern,isinstance,issubclass,iter,len,license,list,locals,long,map,max,memoryview,min,next,object,oct,open,ord,pow,print,property,quit,range,raw_input,reduce,reload,repr,reversed,round,set,setattr,slice,sorted,staticmethod,str,sum,super,tuple,type,unichr,unicode,vars,xrange,zip");
Blockly.Python.ORDER_ATOMIC=0;Blockly.Python.ORDER_COLLECTION=1;Blockly.Python.ORDER_STRING_CONVERSION=1;Blockly.Python.ORDER_MEMBER=2.1;Blockly.Python.ORDER_FUNCTION_CALL=2.2;Blockly.Python.ORDER_EXPONENTIATION=3;Blockly.Python.ORDER_UNARY_SIGN=4;Blockly.Python.ORDER_BITWISE_NOT=4;Blockly.Python.ORDER_MULTIPLICATIVE=5;Blockly.Python.ORDER_ADDITIVE=6;Blockly.Python.ORDER_BITWISE_SHIFT=7;Blockly.Python.ORDER_BITWISE_AND=8;Blockly.Python.ORDER_BITWISE_XOR=9;Blockly.Python.ORDER_BITWISE_OR=10;
Blockly.Python.ORDER_RELATIONAL=11;Blockly.Python.ORDER_LOGICAL_NOT=12;Blockly.Python.ORDER_LOGICAL_AND=13;Blockly.Python.ORDER_LOGICAL_OR=14;Blockly.Python.ORDER_CONDITIONAL=15;Blockly.Python.ORDER_LAMBDA=16;Blockly.Python.ORDER_NONE=99;
Blockly.Python.ORDER_OVERRIDES=[[Blockly.Python.ORDER_FUNCTION_CALL,Blockly.Python.ORDER_MEMBER],[Blockly.Python.ORDER_FUNCTION_CALL,Blockly.Python.ORDER_FUNCTION_CALL],[Blockly.Python.ORDER_MEMBER,Blockly.Python.ORDER_MEMBER],[Blockly.Python.ORDER_MEMBER,Blockly.Python.ORDER_FUNCTION_CALL],[Blockly.Python.ORDER_LOGICAL_NOT,Blockly.Python.ORDER_LOGICAL_NOT],[Blockly.Python.ORDER_LOGICAL_AND,Blockly.Python.ORDER_LOGICAL_AND],[Blockly.Python.ORDER_LOGICAL_OR,Blockly.Python.ORDER_LOGICAL_OR]];
Blockly.Python.init=function(a){Blockly.Python.PASS=this.INDENT+"pass\n";Blockly.Python.definitions_=Object.create(null);Blockly.Python.functionNames_=Object.create(null);Blockly.Python.variableDB_?Blockly.Python.variableDB_.reset():Blockly.Python.variableDB_=new Blockly.Names(Blockly.Python.RESERVED_WORDS_);Blockly.Python.variableDB_.setVariableMap(a.getVariableMap());for(var d=[],b=a.getAllVariables(),c=0;c<b.length;c++)d[c]=Blockly.Python.variableDB_.getName(b[c].getId(),Blockly.Variables.NAME_TYPE)+
" = None";a=Blockly.Variables.allDeveloperVariables(a);for(c=0;c<a.length;c++)d.push(Blockly.Python.variableDB_.getName(a[c],Blockly.Names.DEVELOPER_VARIABLE_TYPE)+" = None");Blockly.Python.definitions_.variables=d.join("\n")};
Blockly.Python.finish=function(a){var d=[],b=[],c;for(c in Blockly.Python.definitions_){var e=Blockly.Python.definitions_[c];e.match(/^(from\s+\S+\s+)?import\s+\S+/)?d.push(e):b.push(e)}delete Blockly.Python.definitions_;delete Blockly.Python.functionNames_;Blockly.Python.variableDB_.reset();return(d.join("\n")+"\n\n"+b.join("\n\n")).replace(/\n\n+/g,"\n\n").replace(/\n*$/,"\n\n\n")+a};Blockly.Python.scrubNakedValue=function(a){return a+"\n"};
Blockly.Python.quote_=function(a){a=a.replace(/\\/g,"\\\\").replace(/\n/g,"\\\n").replace(/%/g,"\\%");var d="'";-1!==a.indexOf("'")&&(-1===a.indexOf('"')?d='"':a=a.replace(/'/g,"\\'"));return d+a+d};
Blockly.Python.scrub_=function(a,d){var b="";if(!a.outputConnection||!a.outputConnection.targetConnection){var c=a.getCommentText();(c=Blockly.utils.wrap(c,Blockly.Python.COMMENT_WRAP-3))&&(b=a.getProcedureDef?b+('"""'+c+'\n"""\n'):b+Blockly.Python.prefixLines(c+"\n","# "));for(var e=0;e<a.inputList.length;e++)a.inputList[e].type==Blockly.INPUT_VALUE&&(c=a.inputList[e].connection.targetBlock())&&(c=Blockly.Python.allNestedComments(c))&&(b+=Blockly.Python.prefixLines(c,"# "))}e=a.nextConnection&&a.nextConnection.targetBlock();
e=Blockly.Python.blockToCode(e);return b+d+e};Blockly.Python.getAdjustedInt=function(a,d,b,c){b=b||0;a.workspace.options.oneBasedIndex&&b--;var e=a.workspace.options.oneBasedIndex?"1":"0";a=Blockly.Python.valueToCode(a,d,b?Blockly.Python.ORDER_ADDITIVE:Blockly.Python.ORDER_NONE)||e;Blockly.isNumber(a)?(a=parseInt(a,10)+b,c&&(a=-a)):(a=0<b?"int("+a+" + "+b+")":0>b?"int("+a+" - "+-b+")":"int("+a+")",c&&(a="-"+a));return a};
Blockly.JavaScript.text_indexOf=function(a){var d="FIRST"==a.getFieldValue("END")?"indexOf":"lastIndexOf",b=Blockly.JavaScript.valueToCode(a,"FIND",Blockly.JavaScript.ORDER_NONE)||"''";return[(Blockly.JavaScript.valueToCode(a,"VALUE",Blockly.JavaScript.ORDER_MEMBER)||"''")+"."+d+"("+b+")",Blockly.JavaScript.ORDER_MEMBER]};