import os
import sys
import subprocess
import tempfile
import logging
from typing import Dict, Any
from app.core.config import get_settings

logger = logging.getLogger("rubricore_worker")
settings = get_settings()

def execute_student_code(code_string: str, timeout: int = 10) -> Dict[str, Any]:
    """
    Executes student-submitted python code safely.
    If E2B_API_KEY is configured, uses the secure E2B Code Interpreter microVM.
    Otherwise, falls back to a local isolated python subprocess with strict timeouts.
    """
    # 1. Check if E2B API Key is present
    api_key = settings.e2b_api_key or os.environ.get("E2B_API_KEY", "")
    
    if api_key:
        logger.info("Initializing secure E2B Code Interpreter microVM...")
        try:
            from e2b_code_interpreter import CodeInterpreter
            
            with CodeInterpreter(api_key=api_key) as sandbox:
                result = sandbox.notebook.exec_cell(code_string)
                
                # Check for compile/runtime errors in notebook cell
                error_msg = None
                success = True
                if result.error:
                    success = False
                    error_msg = f"{result.error.name}: {result.error.value}\n{result.error.traceback}"
                
                return {
                    "success": success,
                    "stdout": result.stdout or "",
                    "stderr": result.stderr or "",
                    "error": error_msg,
                    "mode": "e2b_sandbox"
                }
        except Exception as e:
            logger.error(f"E2B microVM execution failed: {e}. Falling back to local subprocess...")
            # Fallback to local subprocess if E2B client fails to initialize/connect
    
    # 2. Local Subprocess Fallback (Offline / Dev mode)
    logger.warning("E2B_API_KEY not configured or unreachable. Falling back to local python subprocess execution...")
    
    # Write student code to a temp file
    with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w", encoding="utf-8") as temp_file:
        temp_file.write(code_string)
        temp_file_path = temp_file.name

    try:
        # Use current Python executable (e.g. from the virtualenv)
        python_exe = sys.executable
        
        # Run code with strict timeout and environment variables cleared to limit access
        process = subprocess.run(
            [python_exe, temp_file_path],
            capture_output=True,
            text=True,
            timeout=timeout,
            env={"PYTHONPATH": os.getcwd()} # only allow local imports
        )
        
        success = process.returncode == 0
        return {
            "success": success,
            "stdout": process.stdout,
            "stderr": process.stderr,
            "error": None if success else f"Exit Code {process.returncode}\n{process.stderr}",
            "mode": "local_subprocess"
        }
    except subprocess.TimeoutExpired as te:
        logger.error(f"Local subprocess execution timed out after {timeout} seconds.")
        return {
            "success": False,
            "stdout": te.stdout or "",
            "stderr": te.stderr or "",
            "error": f"TimeoutExpired: Execution exceeded limit of {timeout} seconds.",
            "mode": "local_subprocess"
        }
    except Exception as e:
        logger.error(f"Local subprocess run failed: {e}")
        return {
            "success": False,
            "stdout": "",
            "stderr": str(e),
            "error": str(e),
            "mode": "local_subprocess"
        }
    finally:
        # Clean up temp file
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except OSError:
                pass
