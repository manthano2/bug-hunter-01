/* =========================================================
   BUG HUNTER — levels.js
   All 20 levels live here. To add a level, copy one object
   and append it to the LEVELS array (give it the next id).

   Each level has:
     id, title, topic, difficulty, description
     broken       the buggy code shown in the editor
     expected     what the FIXED program must print (one entry per line)
     requires     regexes that the fixed code MUST match
     forbids      regexes that the fixed code must NOT match
     hints        exactly 3 hints, revealed one at a time
     explanation  short "what was the bug" note shown on completion

   Grading (see gradeLevel): the code is executed, its printed output
   must equal `expected`, AND the requires / forbids checks must pass.
   That stops players from simply typing console.log("answer").
   ========================================================= */

const XP_PER_LEVEL = 100;   // XP for a correct answer
const HINT_COST = 10;       // points deducted per hint

const LEVELS = [

  /* ---------------- BEGINNER (1-5) ---------------- */
  {
    id: 1,
    title: 'The Vanishing Variable',
    topic: 'Missing Semicolon / Wrong Variable',
    difficulty: 'Beginner',
    description: 'The variable is called "name", but console.log() is asking for something that was never created. Find the typo and make the program print the stored value.',
    broken: 'let name = "John"\n\nconsole.log(names)',
    expected: ['John'],
    requires: [/console\.log\(\s*name\s*\)/],
    forbids: [/names/],
    hints: [
      'Check your variable name.',
      'Look carefully at the console.log().',
      'The variable is called "name", not "names".'
    ],
    explanation: 'JavaScript variable names must match exactly. "names" was never declared, so it threw a ReferenceError.'
  },
  {
    id: 2,
    title: 'Typo in the Terminal',
    topic: 'Function Name Error',
    difficulty: 'Beginner',
    description: 'A function called hello() is defined correctly, but it gets called with the wrong name further down. Fix the call so the greeting prints.',
    broken: 'function hello(){\n  console.log("Hello")\n}\n\nhelo()',
    expected: ['Hello'],
    requires: [/^\s*hello\s*\(\s*\)/m],
    forbids: [/\bhelo\b/],
    hints: [
      'Check the spelling of the function call at the bottom.',
      'Function names are spelling-sensitive in JavaScript.',
      'The function is called hello(), not helo().'
    ],
    explanation: 'Calling a function that does not exist (helo) throws "helo is not defined". Names must match the declaration exactly.'
  },
  {
    id: 3,
    title: 'The Impostor Operator',
    topic: 'If Statement Bug',
    difficulty: 'Beginner',
    description: 'This if statement should CHECK whether age equals 18, but one character turns the check into an assignment. Fix the condition.',
    broken: 'let age = 18\n\nif(age = 18){\n  console.log("Adult")\n}',
    expected: ['Adult'],
    requires: [/if\s*\(\s*age\s*(===?|>=)\s*18\s*\)/],
    forbids: [],
    hints: [
      'Look closely at the condition inside the if().',
      'A single = assigns a value. To compare you need == or ===.',
      'Change if(age = 18) into if(age == 18).'
    ],
    explanation: 'A single = assigns a value (and is always truthy here). Use == or === to compare values.'
  },
  {
    id: 4,
    title: 'The Infinite Descent',
    topic: 'Loop Bug',
    difficulty: 'Beginner',
    description: 'This loop should count from 0 up to 5, but the counter moves the wrong way and never finishes. Fix the loop so it counts up and stops.',
    broken: 'for(let i = 0; i <= 5; i--){\n  console.log(i)\n}',
    expected: ['0', '1', '2', '3', '4', '5'],
    requires: [/i\s*(\+\+|\+=\s*1)|\+\+\s*i/],
    forbids: [/i\s*--|--\s*i/],
    hints: [
      'Look at the third part of the for loop.',
      'i-- makes the counter smaller, but the loop needs it to grow past 5.',
      'Change i-- to i++.'
    ],
    explanation: 'i-- moves away from the stop condition (i <= 5), so the loop never ends. i++ counts upward.'
  },
  {
    id: 5,
    title: 'Out of Bounds',
    topic: 'Array Index',
    difficulty: 'Beginner',
    description: 'The fruits array holds three items, but the code reads an index that does not exist and prints "undefined". Point it at "Orange".',
    broken: 'let fruits = ["Apple", "Banana", "Orange"]\n\nconsole.log(fruits[3])',
    expected: ['Orange'],
    requires: [/fruits\s*\[\s*(2|fruits\.length\s*-\s*1)\s*\]/],
    forbids: [/fruits\s*\[\s*3\s*\]/],
    hints: [
      'Array positions start counting at 0.',
      'Three items means valid indexes are 0, 1 and 2.',
      'Use fruits[2].'
    ],
    explanation: 'Arrays are zero-indexed. A 3-item array has indexes 0, 1, 2, so fruits[3] is undefined.'
  },

  /* ---------------- EASY (6-10) ---------------- */
  {
    id: 6,
    title: 'Locked Vault',
    topic: 'const vs let',
    difficulty: 'Easy',
    description: 'The score is declared with const, which can never be reassigned. The program crashes when it tries to update it. Make the update work.',
    broken: 'const score = 10\n\nscore = 20\nconsole.log(score)',
    expected: ['20'],
    requires: [/\b(let|var)\s+score/],
    forbids: [/const\s+score/],
    hints: [
      'Read the error message in the console.',
      'const variables cannot be given a new value.',
      'Declare score with let instead of const.'
    ],
    explanation: 'const creates a constant binding. To change a variable later, declare it with let.'
  },
  {
    id: 7,
    title: 'Number Glue',
    topic: 'String vs Number',
    difficulty: 'Easy',
    description: 'The program should print 8 (5 + 3) but prints something else, because one of the values is text. Make the addition work on numbers.',
    broken: 'let a = "5"\nlet b = 3\n\nconsole.log(a + b)',
    expected: ['8'],
    requires: [/console\.log\([^)]*\b[ab]\b/],
    forbids: [/console\.log\(\s*["']?8["']?\s*\)/, /console\.log\(\s*5\s*\+\s*3\s*\)/],
    hints: [
      'Look at the quotes around the 5.',
      'The + operator joins text together when one value is a string.',
      'Convert it with Number(a) + b, or make a a real number.'
    ],
    explanation: '"5" + 3 joins text and gives "53". Convert the string with Number() (or use a real number) to add.'
  },
  {
    id: 8,
    title: 'The Missing Return',
    topic: 'Function Return Value',
    difficulty: 'Easy',
    description: 'add(2, 3) should give 5, but the function never hands the result back, so you get "undefined". Fix the function.',
    broken: 'function add(a, b){\n  a + b\n}\n\nconsole.log(add(2, 3))',
    expected: ['5'],
    requires: [/\breturn\b/],
    forbids: [],
    hints: [
      'The sum is calculated but then thrown away.',
      'A function only gives a value back when you use the return keyword.',
      'Write return a + b.'
    ],
    explanation: 'Without return, a function gives back undefined. The calculation happened but the result was lost.'
  },
  {
    id: 9,
    title: 'Off By One',
    topic: 'Loop Condition',
    difficulty: 'Easy',
    description: 'This loop should add the numbers 1 through 5 and print 15, but it stops one number too early. Fix the loop condition.',
    broken: 'let sum = 0\n\nfor(let i = 1; i < 5; i++){\n  sum += i\n}\n\nconsole.log(sum)',
    expected: ['15'],
    requires: [/i\s*<=\s*5|i\s*<\s*6/],
    forbids: [],
    hints: [
      'Which numbers does the loop actually add right now?',
      'i < 5 stops BEFORE reaching 5.',
      'Use i <= 5 so that 5 is included.'
    ],
    explanation: 'i < 5 excludes 5 itself. Off-by-one errors are one of the most common loop bugs: use <= to include the last value.'
  },
  {
    id: 10,
    title: 'Weekend Detector',
    topic: 'Logical Operators',
    difficulty: 'Easy',
    description: 'The program should print "Weekend" when the day is Saturday OR Sunday. It prints nothing, because the condition can never be true. Fix it.',
    broken: 'let day = "Sunday"\n\nif(day === "Saturday" && day === "Sunday"){\n  console.log("Weekend")\n}',
    expected: ['Weekend'],
    requires: [/\|\||includes\(/],
    forbids: [/&&/],
    hints: [
      'Can day be Saturday AND Sunday at the same time?',
      '&& needs BOTH sides to be true. You want either side.',
      'Replace && with ||.'
    ],
    explanation: '&& means AND (both must be true). A day cannot be two values at once, so you need || (OR).'
  },

  /* ---------------- MEDIUM (11-15) ---------------- */
  {
    id: 11,
    title: 'Trapped in a Block',
    topic: 'Variable Scope',
    difficulty: 'Medium',
    description: 'message is created inside the if block, but console.log() tries to use it outside. The variable does not exist out there. Fix the scope.',
    broken: 'if(true){\n  let message = "Hi there"\n}\n\nconsole.log(message)',
    expected: ['Hi there'],
    requires: [/console\.log\(\s*message\s*\)/],
    forbids: [/console\.log\(\s*["'`]/],
    hints: [
      'Where is message created, and where is it used?',
      'let variables only exist inside the { } block they are declared in.',
      'Declare let message outside (above) the if block, then assign it inside.'
    ],
    explanation: 'let is block-scoped: a variable declared inside { } is invisible outside. Declare it in the outer scope.'
  },
  {
    id: 12,
    title: 'Array Typo',
    topic: 'Array Methods',
    difficulty: 'Medium',
    description: 'We want to add "Mango" to the fruits list and print the new length (3). A misspelled method breaks the program. Fix it.',
    broken: 'let fruits = ["Apple", "Banana"]\n\nfruits.puch("Mango")\n\nconsole.log(fruits.length)',
    expected: ['3'],
    requires: [/\.push\s*\(/],
    forbids: [/puch/],
    hints: [
      'Read the error: something "is not a function".',
      'Check the spelling of the array method.',
      'The method that adds to the end of an array is push().'
    ],
    explanation: 'Methods must be spelled exactly. puch() does not exist; push() appends an item to an array.'
  },
  {
    id: 13,
    title: 'Case Sensitive',
    topic: 'Object Properties',
    difficulty: 'Medium',
    description: 'The user object has a property called name, but the code prints "undefined". JavaScript is case-sensitive. Fix the property access.',
    broken: 'let user = { name: "Ana", age: 21 }\n\nconsole.log(user.Name)',
    expected: ['Ana'],
    requires: [/user\s*(\.name\b|\[\s*["']name["']\s*\])/],
    forbids: [/user\.Name/],
    hints: [
      'Compare the property name in the object with the one you read.',
      'JavaScript treats name and Name as two different things.',
      'Use user.name (lowercase n).'
    ],
    explanation: 'Property names are case-sensitive. user.Name does not exist, so the result is undefined.'
  },
  {
    id: 14,
    title: 'Countdown Gone Wrong',
    topic: 'While Loop',
    difficulty: 'Medium',
    description: 'This countdown should print 3, 2, 1 and stop. Instead it prints 3 forever. Fix the loop so it ends.',
    broken: 'let count = 3\n\nwhile(count > 0){\n  console.log(count)\n}',
    expected: ['3', '2', '1'],
    requires: [/count\s*(--|-=\s*1|=\s*count\s*-\s*1)|--\s*count/],
    forbids: [],
    hints: [
      'Does count ever change inside the loop?',
      'A while loop only stops when its condition becomes false.',
      'Add count-- inside the loop.'
    ],
    explanation: 'Nothing ever changed count, so count > 0 stayed true forever. Always update the value your loop condition depends on.'
  },
  {
    id: 15,
    title: 'Yes Means Yes',
    topic: 'String Comparison',
    difficulty: 'Medium',
    description: 'The answer is "Yes" but the check compares it with "yes", so "Correct" never prints. Fix the comparison.',
    broken: 'let answer = "Yes"\n\nif(answer === "yes"){\n  console.log("Correct")\n}',
    expected: ['Correct'],
    requires: [/toLowerCase\s*\(|toUpperCase\s*\(|===?\s*["']Yes["']/],
    forbids: [/if\s*\(\s*true\s*\)/],
    hints: [
      'Compare the two strings letter by letter.',
      'Uppercase and lowercase letters are different characters.',
      'Use answer.toLowerCase() === "yes", or compare with "Yes".'
    ],
    explanation: 'String comparison is case-sensitive: "Yes" !== "yes". Normalise with toLowerCase() or match the exact text.'
  },

  /* ---------------- HARD (16-19) ---------------- */
  {
    id: 16,
    title: 'The Extra Step',
    topic: 'Array Loop Boundary',
    difficulty: 'Hard',
    description: 'This loop prints every number in the array, then one extra "undefined". Fix the loop so it only visits real items.',
    broken: 'let nums = [10, 20, 30]\n\nfor(let i = 0; i <= nums.length; i++){\n  console.log(nums[i])\n}',
    expected: ['10', '20', '30'],
    requires: [/i\s*<\s*nums\.length|i\s*<=\s*nums\.length\s*-\s*1|i\s*<\s*3|\bof\s+nums|nums\.forEach/],
    forbids: [/i\s*<=\s*nums\.length(?!\s*-)/],
    hints: [
      'How many items are in the array, and which indexes do they use?',
      'The last valid index is length - 1, not length.',
      'Change i <= nums.length to i < nums.length.'
    ],
    explanation: 'An array of length 3 has indexes 0-2. Looping while i <= length reads index 3, which is undefined.'
  },
  {
    id: 17,
    title: 'Wrong Operator',
    topic: 'Function Logic',
    difficulty: 'Hard',
    description: 'multiply(3, 4) should return 12, but the function does something else. The program runs without errors — the bug is in the logic. Find it.',
    broken: 'function multiply(a, b){\n  return a + b\n}\n\nconsole.log(multiply(3, 4))',
    expected: ['12'],
    requires: [/return\s+(a\s*\*\s*b|b\s*\*\s*a)/],
    forbids: [],
    hints: [
      'There is no error message — compare the result with what you expect.',
      'Look at the operator used inside the function.',
      'Multiplication uses *, not +.'
    ],
    explanation: 'Logic bugs do not crash. The function was named multiply but used +. Always check the result, not just the absence of errors.'
  },
  {
    id: 18,
    title: 'Silent Arrow',
    topic: 'Arrow Function Return',
    difficulty: 'Hard',
    description: 'The map() call should double every number and print 2,4,6. Instead it prints empty values. Something is missing inside the arrow function.',
    broken: 'let nums = [1, 2, 3]\n\nlet doubled = nums.map(n => { n * 2 })\n\nconsole.log(doubled.join(","))',
    expected: ['2,4,6'],
    requires: [/\.map\s*\(/],
    forbids: [/["'`]2,4,6["'`]/],
    hints: [
      'Print doubled on its own — what values does it contain?',
      'An arrow function with { } braces needs an explicit return.',
      'Write n => n * 2 (no braces) or n => { return n * 2 }.'
    ],
    explanation: 'Arrow functions only return automatically without braces. With { } you must write return yourself.'
  },
  {
    id: 19,
    title: 'Fall-Through',
    topic: 'Switch Statement',
    difficulty: 'Hard',
    description: 'The light is red, so only "Stop" should print. But "Go" prints too, because the switch keeps running into the next case. Fix it.',
    broken: 'let color = "red"\n\nswitch(color){\n  case "red":\n    console.log("Stop")\n  case "green":\n    console.log("Go")\n    break\n}',
    expected: ['Stop'],
    requires: [/case\s*["']red["']\s*:[\s\S]*?\bbreak\b[\s\S]*?case\s*["']green["']/],
    forbids: [],
    hints: [
      'Count how many lines print instead of one.',
      'Without break, a switch continues into the next case.',
      'Add break after console.log("Stop").'
    ],
    explanation: 'A switch case falls through to the next one unless it ends with break (or return).'
  },

  /* ---------------- BOSS (20) ---------------- */
  {
    id: 20,
    title: 'Boss Fight: findMax',
    topic: 'Multiple Bugs',
    difficulty: 'Boss',
    description: 'findMax() should return the biggest number in an array. It must print 9 for the first list and -2 for the second. This function has TWO bugs — find both to beat the boss.',
    broken: 'function findMax(arr){\n  let max = 0\n\n  for(let i = 1; i < arr.length; i++){\n    if(arr[i] < max){\n      max = arr[i]\n    }\n  }\n\n  return max\n}\n\nconsole.log(findMax([4, 9, 2, 7]))\nconsole.log(findMax([-5, -2, -9]))',
    expected: ['9', '-2'],
    requires: [/let\s+max\s*=\s*(arr\[\s*0\s*\]|-\s*Infinity|Number\.NEGATIVE_INFINITY|Number\.MIN_SAFE_INTEGER)|Math\.max|\.reduce|\.sort/],
    forbids: [/return\s+-?\d+\s*$/m, /console\.log\(\s*-?\d+\s*\)/],
    hints: [
      'There are two separate bugs. Fix one, run the code, then look for the other.',
      'Check the comparison operator, and also what max starts as (negative numbers!).',
      'Start with let max = arr[0] and compare using arr[i] > max.'
    ],
    explanation: 'Two bugs: the comparison was backwards (< instead of >), and starting max at 0 breaks lists of negative numbers. Start from the first element.'
  }
];

/* ---------------- helpers ---------------- */
const TOTAL_LEVELS = LEVELS.length;

function getLevel(id){
  return LEVELS.find(l => l.id === Number(id)) || null;
}

function arraysEqual(a, b){
  if(a.length !== b.length) return false;
  return a.every((v, i) => String(v) === String(b[i]));
}

/* Remove comments so commented-out code cannot satisfy a check */
function stripComments(code){
  return String(code).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function previewOutput(arr){
  if(!arr.length) return '(no output)';
  const shown = arr.slice(0, 6).join('  |  ');
  return arr.length > 6 ? shown + '  | ...' : shown;
}

/* Decide whether a submission solves the level.
   `result` is what the runner returned: { output, error, timedOut } */
function gradeLevel(level, code, result){
  if(result.timedOut){
    return { passed:false, reason:'Your code took too long to finish. Check for an infinite loop.' };
  }
  if(result.error){
    return { passed:false, reason:'Your code still has an error: ' + result.error };
  }
  if(!arraysEqual(result.output, level.expected)){
    return {
      passed:false,
      reason:'Output does not match yet. Expected: ' + previewOutput(level.expected) + '   Got: ' + previewOutput(result.output)
    };
  }
  const clean = stripComments(code);
  const missing = level.requires.some(r => !r.test(clean));
  const forbidden = level.forbids.some(r => r.test(clean));
  if(missing || forbidden){
    return {
      passed:false,
      reason:'The output looks right, but the bug is not really fixed in the code. Fix the actual bug instead of changing what gets printed.'
    };
  }
  return { passed:true, reason:'' };
}
