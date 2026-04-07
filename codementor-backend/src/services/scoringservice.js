// services/scoringService.js - MESIN PENILAIAN OTOMATIS
import { spawn } from 'node:child_process';

// FUNGSI UTAMA: Nilai kode user vs test cases tersembunyi (ASYNC)
const evaluateCode = async (userCode, testCases) => {
  console.log('Mulai penilaian...');
  let passedTests = 0;
  const totalTests = testCases.length;
  
  // Loop sequential untuk menunggu setiap test selesai
  for (let index = 0; index < totalTests; index++) {
    const testCase = testCases[index];
    console.log(`Test ${index + 1}: input="${testCase.input}"`);
    
    // Tunggu hasil eksekusi kode (Promise)
    const testResult = await executeUserCode(userCode, testCase.input);
    
    // Cek output dengan aman (null check)
    const userOutput = testResult.stdout ? testResult.stdout.trim() : '';
    const expectedOutput = testCase.expectedOutput ? testCase.expectedOutput.trim() : '';
    
    if (userOutput === expectedOutput) {
      passedTests++;
      console.log(`Test ${index + 1} LULUS`);
    } else {
      console.log(`Test ${index + 1} GAGAL`);
      console.log(`Expected: "${expectedOutput}"`);
      console.log(`Got: "${userOutput}"`);
    }
  }
  
  // Hitung skor persentase
  const score = Math.round((passedTests / totalTests) * 100);
  console.log(`Final Score: ${score}% (${passedTests}/${totalTests})`);
  
  return score;
};

// Fungsi eksekusi kode user dalam sandbox terisolasi
const executeUserCode = (code, input) => {
  return new Promise((resolve) => {
    // Spawn proses Node.js terpisah (isolasi keamanan)
    const childProcess = spawn('node', [], {
      timeout: 5000,  // Timeout 5 detik cegah infinite loop
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let error = '';
    
    // Capture stdout dari child process
    childProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    // Capture stderr dari child process
    childProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    // Kirim kode user + input ke child process
    childProcess.stdin.write(code + '\n');
    childProcess.stdin.write(input + '\n');
    childProcess.stdin.end();
    
    // Resolve saat proses selesai
    childProcess.on('close', (exitCode) => {
      resolve({
        stdout: output,
        stderr: error,
        exitCode
      });
    });
  });
};

// Export untuk digunakan di controller
export { evaluateCode };