.. highlightlang:: c


.. _extending-intro:

******************************
파이썬과 C C++ 확장(번역)
******************************


만약 당신이 어떻게 C프로그래밍을 하지는 알고 있다면 파이썬에 새로운 모듈을 추가하는것은 꽤 쉽다.
:dfn:`확장 모듈들` 은 파이썬에서 직접적으로 실행될 수 없는 것들을 할 수 있게 해준다.
예를들어 확장모듈은 새로운 타입의 객체를 생성할 수 있고 C 라이브러리와 시스템 콜을 호출할 수 있다.

모듈 확장을 지원하기 위해 파이썬 API (Application Programmers Interface)
는 일련의 함수, 매크로, 파이썬 런타임 시스템에 접근할 수 있는 변수등을 정의하고 있다. 파이썬 API는 ``"Python.h"`` 에 포함되어 있다.

확장 모듈을 컴파일하는 것은 당신의 시스템뿐만 아니라 이것의 본래 사용 목적에 의존한다. 자세한 사항은 이후 챕터에서 다룬다.

당신이 C 라이브러리나 시스템콜을 호출하고 싶다면 임의의 C 코드를 생성하기 보다는 :mod:`ctypes` 모듈을 사용하는 고려해보아야 한다.
:mod:`ctypes` 모듈은 C 코드와 연결하는 파이썬 코드를 작성할 수 있게 해줄 뿐만아니라
확장 모듈을 작성하고 컴파일하여 CPython에 묶는것 보다 이식성이 좋다.



.. _extending-simpleexample:

A Simple Example
================

자 이제 ``spam`` (몬티 파이튼의 팬들이 가장좋아하는 음식)이라 불리는 확장 모듈을 만들어 보고 C 라이브러리 함수
:c:func:`system` 의 파이썬 인터페이스를 만들어 볼 것입니다. [#]_ 이 함수는 문자열을 인자로 받고 정수형을 반환하는 함수이다.
우리는 이 함수가 파이썬에서 다음과 같이 불리길 원한다.

  >>> import spam
  >>> status = spam.system("ls -l")

먼저 :file:`spammodule.c` 파일을 생성하자. (역사적으로, 이 모듈이 ``spam`` 이라고 불린다면,
구현 내용을 포함하는 C 파일은 :file:`spammodule.c` 이라고 불리고 모듈이름이 ``spammify`` 와 같이
매우 길다면 모듈 이름은 단순히 :file:`spammify.c` 가 될것이다.)

파일의 첫번째 라인::

   #include <Python.h>

파이썬 API를 사용하기 위해 헤더를 추가한다. (또한 당신이 사용할 저작권에 관한 내용과 해당 모듈의 목적도 기술 할 수 있다.)

.. note::
  
  몇몇 시스템들의 표준 헤더를 선택하는 전처리 정의 문구를 파이썬이 정의 해놨기 때문에 당신은 :file:`Python.h` 를
  *반드시* 다른 헤더를 포함시키기 전에 포함시켜야 한다.

:file:`Python.h` 에서 표준 헤더파일에 정의된 것을 제외한
사용자의 눈에띄는 모든 기호는 ``Py`` 또는 ``PY`` 라는 접두어를 가지고 있다. ``"Python.h"`` 는
``<stdio.h>``, ``<string.h>``, ``<errno.h>``, ``<stdlib.h>`` 를 포함하고 있는데
그것들은 파이썬 인터프리터에 의해 광범위하게 사용되고 있기 때문이다. 만약 마지막 헤더파일(:file:`stdlib.h`)이
시스템에 존재하지 않는다면 이것은 :c:func:`malloc`, :c:func:`free`, :c:func:`realloc` 과 같은 함수를
직접 선언할 것이다.

다음으로 우리 모듈에 추가할 것은 파이썬에서 ``spam.system(string)`` 을 실행할때 호출될 C 함수이다.
(우리는 어떻게 이것이 호출되는지 간단하게 살펴볼 것이다.)::

   static PyObject *
   spam_system(PyObject *self, PyObject *args)
   {
       const char *command;
       int sts;

       if (!PyArg_ParseTuple(args, "s", &command))
           return NULL;
       sts = system(command);
       return Py_BuildValue("i", sts);
   }

파이선에서 인자 리스트를 C 함수의 인자로 넘기는 변환은 꽤 간단한 편이다.(예를들어 ``"ls -l"`` 와 같은 인자)
C 함수는 언제나 2개의 인자를 받게된다. 관례적으로 인자들은 *self* 와 *args* 로 이름이 지어진다.

The *self* argument points to the module object for module-level functions;
for a method it would point to the object instance.

*args* 인자는 인자들을 포함하는 파이썬 튜플을 가르키고 있다. 튜플의 각 항목은 함수 호출시 넘긴 인자들과
대응된다. 인자들 파이썬 객체들이다. 인자들을 사용하기 위해서 C 함수는 파이썬 객체들을 C 변수로 바꿔야 한다.
:c:func:`Pyarg_ParseTuple` 라는 파이썬 API는 인자의 타입을 검사한 후 C 변수로 바꿀 수 있다. 이 함수는
요구되는 인자들의 타입과 변환된 인자들이 저장될 C 변수들의 타입을 결정하기 위해 템플릿 문자열을 사용한다.
이후에 더 자세한 내용을 다루겠다.

만약 모든 인자들이 올바른 타입을 가지고 있고 C 변수들에 값이 저장되었다면 :c:func:`PyArg_ParseTuple` 은
참(nonzero)을 반환할 것이다. 만약 올바르지 않은 인자들이 전달되었을 경우 거짓(zero)을 반환할것이다. 또한 적절한
예외를 발생시킬 것이다. 그래서 호출한 함수는 즉시 *NULL* 을 반환할 것이다.(이후 예제에서 살펴보겠다.)


.. _extending-errors:

간주곡: 에러와 예외
======================

파이썬 인터프리터에서 중요한 관례가 있는데 예를 들어 함수가 실패했을때 함수가 예외 상태를 세팅하고
에러 변수(대게는 *NULL* 포인터)를 반환 해야하는 것이다. 예외들은 인터프리터 내부의 정적 전역 변수에 저장된다.
만약 이 변수가 *NULL* 포인터 라면 예외가 아직 발생하지 않은 것이다. 두번째 전역 변수는 예외 연관 변수를 저장한다.
:keyword:`raise` 의 두번째 인자와 같다. 세번째 변수는 파이썬 코드에서 에러가 발생했을 경우를 대비한
스택 역추적(traceback)을 포함한다. 이러한 3가지 변수는 파이썬 변수 ``sys.exc_type``, ``sys.exc_value``
, ``sys.exc_traceback`` 과 같다. (파이썬 라이브러리 레퍼런스의 :mod:`sys` 모듈 파트를 확인해라)
에러가 어떻게 전파되는지 이해하기 위해 변수에 대해 아는것은 중요하다.

파이썬 API는 다양한 예외 타입을 정의하는 많은 함수를 정의하고 있다.

:c:func:`PyErr_SetString` 이 가장 일반적인 함수이다. 이 함수의 인자는 예외 타입과 C 문자열이다.
예외 객체는 일반적으로 미리 정의된 객체이다. 예를들어 :c:data:`PyExc_ZeroDivisionError` 와 같은
객체가 있다. C 문자열은 에러의 원인을 나타내며 파이썬 문자열로 변환된다. 또한 연관 변수에 저장된다.

다른 유용한 함수로는 :c:func:`PyErr_SetFromError` 이다. 이 함수는 예외 타입만 인자로 가지고 있고
전역 변수 :c:data:`errno` 검사를 통해 연관 변수를 생성한다. 가장 일반적인 함수는 :c:func:`PyErr_SetObject` 
로 2개의 인자를 가진다. 예외 타입 연관 변수를 가진다. 당신은 이러한 함수들에 전달되는 객체들에
:c:func:`Py_INCREF` 함수를 사용할 필요가 없다.

당신은 :c:func:`PyErr_Occurred` 호출을 통해 예외에 아무런 영향을 미치지 않은
예외가 설정되었는지 확인할 수 있다. 이 함수는 현재 예외 객체 또는 *NULL* (아무런 예외가 발생하지 않았을 때)
을 반환할 것이다. 당신은 반환 값을 통해 알아 내기 때문에 일반적으로 함수 호출 속에서 에러가 발생하였는지 알기 위해
:c:func:`PyErr_Occurred` 를 호출할 필요가 없을 것이다.

다른 함수 *g* 를 호출하는 함수 *f* 가 *g* 가 실패했음을 감지 했을때 함수 *f* 는 스스로 에러 변수(주로 *NULL* 또는 ``-1``)을 반환해야 합니다. 이 함수는 :c:func:`PyErr_\*` 함수 중 하나를 호출하지 않아야 한다.
함수 *g* 에 의해 호출되기 때문이다. 그리고 *f* 의 호출자는 :c:func:`PyErr_\*` 를 호출할 필요없이
에러의 징후를 호출자의 호출자에게 반환하는 등의 작업이 필요하다. 에러의 자세한 원인은 이미 처음 에러를 감지한
함수에 의해 기록되었다. 한번 에러가 파이썬 인터프리터의 메인 루프까지 도달하게 되면
인터프리터는 현재 실행중이던 파이썬 코드를 중단하고 예외 핸들러를 찾는다.

(모듈이 :c:func:`PyErr_\*` 함수를 호출함으로써 자세한 에러 메세지를 전달하게된다. 그러나 일반적으로
이것은 꼭 필수적이지 않다. 다양한 원인으로 작동이 중지되기 때문에 이것은 손실된 에러의 원인에 관련된 정보를 만들 수
있다.)

함수 실패를 통한 예외를 무시하기 원한다면 :c:func:`PyErr_Clear` 를 호출함으로써 예외 상태를 제거할 수
있다. 에러를 인터프리터에게 전달하지 않길 원하면서 예외를 완벽하게 다르고 싶을때 :c:func:`PyErr_Clear` 
를 호출하는것이 좋다. (다른 무엇가를 시도하거나 잘못된것이 없다고 가정하는것이 가능하다.)

모든 :c:func:`malloc` 함수 호출이 실패하는것은 예외를 발생하게 된다. 이때 :c:func:`malloc` 
(또는 :c:func:`realloc`)의 호출자는 반드시 :c:func:`PyErr_NoMemory` 를 호출 해야하고
실패를 암시하는 값을 반환 해야한다. 모든 객체를 생성하는 함수들은 
(예를 들어 :c:func:`PyInt_FromLong`) 이미 이러한 매커니즘을 내포하고 있다.(:c:func:`malloc` 을 사용하는 모든 함수에 해당한다.)

또한 :c:func:`PyArg_ParseTuple` 와 관련 함수에 예외가 생길경우 이 함수들은 성공할 경우 양수나 0
실패할 경우 ``-1`` 을 반환한다. (유닉스 시스템 콜과 유사하게)

마지막으로 당신이 에러를 암시하는 값을 반환할때 가비지를 비우는 것에 주의를 기울여야 한다.
(:c:func:`Py_XDECREF` 함수 또는 :c:func:`Py_DECREF` 함수로 당신이 이미 생성한 객체를
처리하게 함으로써)

어떤 예외를 일으킬지 선택하는것은 전적으로 당신의 몫이다. 미리 정의된 파이썬 객체들과 대응되는 미리 선언되어있는 C 객체들이 있다.
예를들어 :c:data:`PyExc_ZeroDivisionError` 과 같은 것이 있다. 당신은 현명하게 예외를 선택 해야한다. 예를들어
파일이 열리지 않는 상황에 :c:data:`PyExc_TypeError` 를 사용해선 안되고 :c:data:`PyExc_IOError` 를 사용해야 한다.
만약 인자가 잘못되었다면 :c:func:`PyArg_ParseTuple` 함수는 :c:data:`PyExc_TypeError` 예외를 발생 시킬것이다.
만약 당신이 특정 범위안에 있는 인자를 받아야 하거나 다른 상태들을 만족시켜야 하는 상황이라면 :c:data:`PyExc_ValueError` 예외를
발생시키는 것이 적절할 것이다.

당신은 당신의 모듈에 특화된 새로운 예외를 정의할 수 있다. 이를 위해 당신은 정적 객체 변수를 파일의 시작 부분에 정의할 것이다.::

   static PyObject *SpamError;

그리고 모듈의 초기화 함수 (:c:func:`initspam`)에서 예외 객체를 초기화 할 것이다.
(leaving out the error checking for now)::

   PyMODINIT_FUNC
   initspam(void)
   {
       PyObject *m;

       m = Py_InitModule("spam", SpamMethods);
       if (m == NULL)
           return;

       SpamError = PyErr_NewException("spam.error", NULL, NULL);
       Py_INCREF(SpamError);
       PyModule_AddObject(m, "error", SpamError);
   }

예외 객체의 파이썬 이름은 :exc:`spam.error` 이다. :c:func:`PyErr_NewException` 함수는
:exc:`Exception` 을 상속받은 클래스를 생성할 것이다. (*NULL* 대신 다른 클래스가 전달되지 않는다면)

:c:data:`SpamError` 변수는 새롭게 생성된 예외의 참조값을 유지하고 있다. 이것은 매우 의도적인데
참조값은 버려지지 않는것이 보장되어야 한다. 지워질 경우 댕글링 포인터 문제가
발생할 수 있다. 

우리는 나중에 위 샘플코드에서 함수 반환 타입인 ``PyMODINIT_FUNC`` 에 대해 논의할 것이다.

:exc:`spam.error` 예외는 :c:func:`PyErr_SetString` 를 호출하면서 발생할 것이다.::

   static PyObject *
   spam_system(PyObject *self, PyObject *args)
   {
       const char *command;
       int sts;

       if (!PyArg_ParseTuple(args, "s", &command))
           return NULL;
       sts = system(command);
       if (sts < 0) {
           PyErr_SetString(SpamError, "System command failed");
           return NULL;
       }
       return PyLong_FromLong(sts);
   }


.. _backtoexample:

다시 예제로
===============

다시 예제 함수로 돌아가서 우리는 이제 이 코드를 이해할 수 있어야 한다.::

   if (!PyArg_ParseTuple(args, "s", &command))
       return NULL;

만약 인자에서 예외가 발견된다면 *NULL* 을 반환할 것이다.(이것은 객체 포인터를 반환하는 함수에서 보일 수 있는 에러의 징후이다.)
예외 세팅은 :c:func:`PyArg_ParseTuple` 에 의존한다. 만약 그렇지 않다면 :c:data:`command` 변수에 문자열이 복사될 것 이다.
이것은 포인터 할당이다. 당신은 문자열을 수정해선 안된다. (그래서 표준 C 에서는 변수 :c:data:`command` 를 ``const char *command``
로 선언했다.)

다음 코드는 유닉스 함수 :c:func:`system` 을 호출하는 부분이다. 인자로 :c:func:`PyArg_ParseTuple` 에서 전달된
문자열을 넘긴다.

   sts = system(command);

:func:`spam.system` 함수는 파이썬 객체를 :c:data:`sts` 에 반환해야 한다. 이것은 :c:func:`PyArg_ParseTuple` 의
반대인 함수 :c:func:`Py_BuildValue` 를 사용한다. 이 함수는 포맷 스트링과 임의의 C 변수를 가지고 새로운 파이썬 객체를 반환한다.
:c:func:`Py_BuildValue` 의 더 자세한 정보는 이후에 나온다.::

   return Py_BuildValue("i", sts);

이 케이스에선 정수형 객체를 반환할 것이다. (물론 정수들은 파이썬 힙에 저장된 객체들이다.)

만약 C 함수가 :c:type:`void` 와 같이 사용할 수 없는 값을 반환한다면 상응하는 파이썬 객체는 ``None``
이다. 당신은 :c:macro:`Py_RETURN_NONE` 로 구현된 동등한 것을 사용할 수 있다.

   Py_INCREF(Py_None);
   return Py_None;

:c:data:`Py_None` 은 파이썬 객체 ``None`` 의 C 이름이다. 이것은 *NULL* 포인터 라기 보단 진짜 파이썬
객체이다. 앞으로 보게될 대부분의 문맥들에서 에러를 의미하게 될 것이다.

.. _methodtable:

메서드 테이블과 초기화 함수
=============================

나는 파이썬 프로그램에서 :c:func:`spam_system` 을 어떻게 호출하는지 보여주고 싶다.
첫번째로 우리는 함수의 이름과 주소를 리스트로 만들 필요가 있다.::

   static PyMethodDef SpamMethods[] = {
       ...
       {"system",  spam_system, METH_VARARGS,
        "Execute a shell command."},
       ...
       {NULL, NULL, 0, NULL}        /* Sentinel */
   };

세번째 항목 (``METH_VARARGS``)을 알아보자. 이것은 인터프리터에게 C 함수에서 사용되는 호출 규약을 알려주는
플래그이다. 이것은 일반적으로 ``METH_VARARGS`` 또는 ``METH_VARARGS | METH_KEYWORDS``로 사용된다.
a value of ``0`` means that an obsolete variant of :c:func:`PyArg_ParseTuple` is used.

``METH_VARARGS`` 를 사용할때는 해당 함수는 :c:func:`PyArg_ParseTuple` 를 통해 파싱할 수 있는
튜플을 파이썬 매개변수로 넘기는것을 기대한다. 더 자세한 정보는 아래에 제공된다.

만약 키워드(딕셔너리) 인자가 함수에 전달되길 기대할 경우 :const:`METH_KEYWORDS` 비트가 체크된다.
이 경우에 C 함수는 사전 객체인 ``PyObject *`` 매개변수를 받아들이게 된다.
그러한 인자를 파싱하기 위해 :c:func:`PyArg_ParseTupleAndKeywords` 함수를 사용해야 한다.

메서드 테이블은 모듈의 초기화 함수에서 인터프리터에게 전달되어야 한다. 초기화 함수는 :c:func:`initname`
(여기서 *name* 은 모듈의 이름) 이라고 이름지어져야 한다. 그리고 비-정적 함수로 정의되어야 한다.::

   PyMODINIT_FUNC
   initspam(void)
   {
       (void) Py_InitModule("spam", SpamMethods);
   }

Note that PyMODINIT_FUNC declares the function as ``void`` return type,
declares any special linkage declarations required by the platform, and for  C++
declares the function as ``extern "C"``. *(번역하지 못한 부분)*

처음 파이썬 프로그램이 :mod:`spam` 모듈을 사용할때 :c:func:`initspam` 이 호출된다.
(아래에 파이썬 내장에 대한 부분이 있다.) 이것은 :c:func:`Py_InitModule` 을 호출한다. 이 함수는
``sys.moudles`` 안에 ``"spam"`` 을 키로 갖는 객체를 생성한다. 그리고 새롭게 생성된 모듈에
:c:type:`PyMethodDef` (두번째 인자로 넘겨진) 구조체 배열이 있는 테이블을 기반으로 함수들을 삽입한다.
:c:func:`Py_InitModule` 은 모듈 객체의 포인터를 생성한 후 반환한다. 만약 초기화가 실패한다면 치명적인 에러로
프로세스가 중단되거나 *NULL* 을 반환할 것이다.

파이썬을 내장할때 :c:func:`initspam` 함수는 :c:data:`_PyImport_Inittab` 테이블에
항목이 있지 않는 한 자동적으로 호출되지 않는다. 가장 간단한 방법은 :c:func:`Py_Initialize` 를 호출한 후
:c:func:`initspam` 을 호출함으로써 정적으로 당신의 모듈을 초기화 하는것이다.::

   int
   main(int argc, char *argv[])
   {
       /* Pass argv[0] to the Python interpreter */
       Py_SetProgramName(argv[0]);

       /* Initialize the Python interpreter.  Required. */
       Py_Initialize();

       /* Add a static module */
       initspam();

       ...

예제는 :file:`Demo/embed/demo.c` 에서 찾을 수 있다.

.. note::

   ``sys.modules`` 에서 항목을 제거하거나 모듈을 하나의 프로세스 (:c:func:`exec` 를 하지않은 :c:func:`fork`)
   안에서 컴파일된 모듈들을 다수의 인터프리터에 가져오는것은 몇몇 존재하는 모듈에 문제를 생기게 할 수 있다.
   내부 데이터 구조를 초기화할때 반드시 주의를 기울여야 한다. :func:`reload` 함수는 확장 모듈과 함께 사용된다.
   이 함수는 초기화 함수 (:c:func:`initspam`)를 호출할 것이고 만약 :file:`.so` 나 :file:`.dll` 같은
   동적으로 로딩되는 오브젝트 파일로부터 로드되었다면 모듈을 다시 로드하지 못할 것이다.

상당수의 예제 모듈들은 :file:`Modules/xxmodule.c` 에 포함되어 있다. 이 파일은 템플릿이나 간단히 보는 예제로
사용될 수 있을 것이다.

.. _compilation:

컴파일과 링크
=================

새로운 확장을 사용하기전에 컴파일과 링크가 되어야 한다. 만약 당신이 동적 로딩을 사용할 경우 자세한 것은 시스템의
동적 로딩 스타일에 따라 다르다. 확장 모듈을 빌드하는 챕터를 봐라 (챕터 :ref:`building`) 그리고
윈도우에서 빌드하는 것과 관련된 추가적인 정보를 봐라. (:ref:`building-on-windows`) 

만약 당신이 동적 로딩을 사용할 수 없거나 파이썬 인터프리터의 영구적인 모듈을 만들고자 한다면 당신은 Setup의 구성을
변환하고 다시 인터프리터를 빌드하면 된다. 운좋게도 유닉스에서 매우 간단한 일이다. 당신의 파일(:file:`spammodule.c`)
를 압축해제된 :file:`Module/` 폴더에 넣고 :file:`Modules/Setup.local` 파일에 다음 한줄을 추가해라.::

   spam spammodule.o 

그리고 최상위 디렉토리에서 :program:`make` 를 실행 함으로써 인터프리터를 재빌드 해라.
또한 하위 디렉토리 :file:`Modules/` 에서 :program:`make` 를 동작시킬 수 있다.
그러나 먼저 당신은 ':program:`make` Makefile' 를 실행함으로써 :file:`Makefile` 을 재빌드 해야한다.
(당신이 :file:`Setup` 파일을 바꿀때마다 필수적인 작업이다.)

만약 당신의 모듈이 추가적인 라이브러리를 요구한다면 구성 파일의 각 라인에 추가적인 라이브러리 들이 나열될것이다.::

   spam spammodule.o -lX11


.. _callingpython:

C 에서 파이썬 함수 호출
=======================

So far we have concentrated on making C functions callable from Python.  The
reverse is also useful: calling Python functions from C. This is especially the
case for libraries that support so-called "callback" functions.  If a C
interface makes use of callbacks, the equivalent Python often needs to provide a
callback mechanism to the Python programmer; the implementation will require
calling the Python callback functions from a C callback.  Other uses are also
imaginable.

Fortunately, the Python interpreter is easily called recursively, and there is a
standard interface to call a Python function.  (I won't dwell on how to call the
Python parser with a particular string as input --- if you're interested, have a
look at the implementation of the :option:`-c` command line option in
:file:`Modules/main.c` from the Python source code.)

Calling a Python function is easy.  First, the Python program must somehow pass
you the Python function object.  You should provide a function (or some other
interface) to do this.  When this function is called, save a pointer to the
Python function object (be careful to :c:func:`Py_INCREF` it!) in a global
variable --- or wherever you see fit. For example, the following function might
be part of a module definition::

   static PyObject *my_callback = NULL;

   static PyObject *
   my_set_callback(PyObject *dummy, PyObject *args)
   {
       PyObject *result = NULL;
       PyObject *temp;

       if (PyArg_ParseTuple(args, "O:set_callback", &temp)) {
           if (!PyCallable_Check(temp)) {
               PyErr_SetString(PyExc_TypeError, "parameter must be callable");
               return NULL;
           }
           Py_XINCREF(temp);         /* Add a reference to new callback */
           Py_XDECREF(my_callback);  /* Dispose of previous callback */
           my_callback = temp;       /* Remember new callback */
           /* Boilerplate to return "None" */
           Py_INCREF(Py_None);
           result = Py_None;
       }
       return result;
   }

This function must be registered with the interpreter using the
:const:`METH_VARARGS` flag; this is described in section :ref:`methodtable`.  The
:c:func:`PyArg_ParseTuple` function and its arguments are documented in section
:ref:`parsetuple`.

The macros :c:func:`Py_XINCREF` and :c:func:`Py_XDECREF` increment/decrement the
reference count of an object and are safe in the presence of *NULL* pointers
(but note that *temp* will not be  *NULL* in this context).  More info on them
in section :ref:`refcounts`.

.. index:: single: PyObject_CallObject()

Later, when it is time to call the function, you call the C function
:c:func:`PyObject_CallObject`.  This function has two arguments, both pointers to
arbitrary Python objects: the Python function, and the argument list.  The
argument list must always be a tuple object, whose length is the number of
arguments.  To call the Python function with no arguments, pass in NULL, or
an empty tuple; to call it with one argument, pass a singleton tuple.
:c:func:`Py_BuildValue` returns a tuple when its format string consists of zero
or more format codes between parentheses.  For example::

   int arg;
   PyObject *arglist;
   PyObject *result;
   ...
   arg = 123;
   ...
   /* Time to call the callback */
   arglist = Py_BuildValue("(i)", arg);
   result = PyObject_CallObject(my_callback, arglist);
   Py_DECREF(arglist);

:c:func:`PyObject_CallObject` returns a Python object pointer: this is the return
value of the Python function.  :c:func:`PyObject_CallObject` is
"reference-count-neutral" with respect to its arguments.  In the example a new
tuple was created to serve as the argument list, which is :c:func:`Py_DECREF`\
-ed immediately after the :c:func:`PyObject_CallObject` call.

The return value of :c:func:`PyObject_CallObject` is "new": either it is a brand
new object, or it is an existing object whose reference count has been
incremented.  So, unless you want to save it in a global variable, you should
somehow :c:func:`Py_DECREF` the result, even (especially!) if you are not
interested in its value.

Before you do this, however, it is important to check that the return value
isn't *NULL*.  If it is, the Python function terminated by raising an exception.
If the C code that called :c:func:`PyObject_CallObject` is called from Python, it
should now return an error indication to its Python caller, so the interpreter
can print a stack trace, or the calling Python code can handle the exception.
If this is not possible or desirable, the exception should be cleared by calling
:c:func:`PyErr_Clear`.  For example::

   if (result == NULL)
       return NULL; /* Pass error back */
   ...use result...
   Py_DECREF(result);

Depending on the desired interface to the Python callback function, you may also
have to provide an argument list to :c:func:`PyObject_CallObject`.  In some cases
the argument list is also provided by the Python program, through the same
interface that specified the callback function.  It can then be saved and used
in the same manner as the function object.  In other cases, you may have to
construct a new tuple to pass as the argument list.  The simplest way to do this
is to call :c:func:`Py_BuildValue`.  For example, if you want to pass an integral
event code, you might use the following code::

   PyObject *arglist;
   ...
   arglist = Py_BuildValue("(l)", eventcode);
   result = PyObject_CallObject(my_callback, arglist);
   Py_DECREF(arglist);
   if (result == NULL)
       return NULL; /* Pass error back */
   /* Here maybe use the result */
   Py_DECREF(result);

Note the placement of ``Py_DECREF(arglist)`` immediately after the call, before
the error check!  Also note that strictly speaking this code is not complete:
:c:func:`Py_BuildValue` may run out of memory, and this should be checked.

You may also call a function with keyword arguments by using
:c:func:`PyObject_Call`, which supports arguments and keyword arguments.  As in
the above example, we use :c:func:`Py_BuildValue` to construct the dictionary. ::

   PyObject *dict;
   ...
   dict = Py_BuildValue("{s:i}", "name", val);
   result = PyObject_Call(my_callback, NULL, dict);
   Py_DECREF(dict);
   if (result == NULL)
       return NULL; /* Pass error back */
   /* Here maybe use the result */
   Py_DECREF(result);


.. _parsetuple:

Extracting Parameters in Extension Functions
============================================

.. index:: single: PyArg_ParseTuple()

The :c:func:`PyArg_ParseTuple` function is declared as follows::

   int PyArg_ParseTuple(PyObject *arg, char *format, ...);

The *arg* argument must be a tuple object containing an argument list passed
from Python to a C function.  The *format* argument must be a format string,
whose syntax is explained in :ref:`arg-parsing` in the Python/C API Reference
Manual.  The remaining arguments must be addresses of variables whose type is
determined by the format string.

Note that while :c:func:`PyArg_ParseTuple` checks that the Python arguments have
the required types, it cannot check the validity of the addresses of C variables
passed to the call: if you make mistakes there, your code will probably crash or
at least overwrite random bits in memory.  So be careful!

Note that any Python object references which are provided to the caller are
*borrowed* references; do not decrement their reference count!

Some example calls::

   int ok;
   int i, j;
   long k, l;
   const char *s;
   int size;

   ok = PyArg_ParseTuple(args, ""); /* No arguments */
       /* Python call: f() */

::

   ok = PyArg_ParseTuple(args, "s", &s); /* A string */
       /* Possible Python call: f('whoops!') */

::

   ok = PyArg_ParseTuple(args, "lls", &k, &l, &s); /* Two longs and a string */
       /* Possible Python call: f(1, 2, 'three') */

::

   ok = PyArg_ParseTuple(args, "(ii)s#", &i, &j, &s, &size);
       /* A pair of ints and a string, whose size is also returned */
       /* Possible Python call: f((1, 2), 'three') */

::

   {
       const char *file;
       const char *mode = "r";
       int bufsize = 0;
       ok = PyArg_ParseTuple(args, "s|si", &file, &mode, &bufsize);
       /* A string, and optionally another string and an integer */
       /* Possible Python calls:
          f('spam')
          f('spam', 'w')
          f('spam', 'wb', 100000) */
   }

::

   {
       int left, top, right, bottom, h, v;
       ok = PyArg_ParseTuple(args, "((ii)(ii))(ii)",
                &left, &top, &right, &bottom, &h, &v);
       /* A rectangle and a point */
       /* Possible Python call:
          f(((0, 0), (400, 300)), (10, 10)) */
   }

::

   {
       Py_complex c;
       ok = PyArg_ParseTuple(args, "D:myfunction", &c);
       /* a complex, also providing a function name for errors */
       /* Possible Python call: myfunction(1+2j) */
   }


.. _parsetupleandkeywords:

Keyword Parameters for Extension Functions
==========================================

.. index:: single: PyArg_ParseTupleAndKeywords()

The :c:func:`PyArg_ParseTupleAndKeywords` function is declared as follows::

   int PyArg_ParseTupleAndKeywords(PyObject *arg, PyObject *kwdict,
                                   char *format, char *kwlist[], ...);

The *arg* and *format* parameters are identical to those of the
:c:func:`PyArg_ParseTuple` function.  The *kwdict* parameter is the dictionary of
keywords received as the third parameter from the Python runtime.  The *kwlist*
parameter is a *NULL*-terminated list of strings which identify the parameters;
the names are matched with the type information from *format* from left to
right.  On success, :c:func:`PyArg_ParseTupleAndKeywords` returns true, otherwise
it returns false and raises an appropriate exception.

.. note::

   Nested tuples cannot be parsed when using keyword arguments!  Keyword parameters
   passed in which are not present in the *kwlist* will cause :exc:`TypeError` to
   be raised.

.. index:: single: Philbrick, Geoff

Here is an example module which uses keywords, based on an example by Geoff
Philbrick (philbrick@hks.com)::

   #include "Python.h"

   static PyObject *
   keywdarg_parrot(PyObject *self, PyObject *args, PyObject *keywds)
   {
       int voltage;
       char *state = "a stiff";
       char *action = "voom";
       char *type = "Norwegian Blue";

       static char *kwlist[] = {"voltage", "state", "action", "type", NULL};

       if (!PyArg_ParseTupleAndKeywords(args, keywds, "i|sss", kwlist,
                                        &voltage, &state, &action, &type))
           return NULL;

       printf("-- This parrot wouldn't %s if you put %i Volts through it.\n",
              action, voltage);
       printf("-- Lovely plumage, the %s -- It's %s!\n", type, state);

       Py_INCREF(Py_None);

       return Py_None;
   }

   static PyMethodDef keywdarg_methods[] = {
       /* The cast of the function is necessary since PyCFunction values
        * only take two PyObject* parameters, and keywdarg_parrot() takes
        * three.
        */
       {"parrot", (PyCFunction)keywdarg_parrot, METH_VARARGS | METH_KEYWORDS,
        "Print a lovely skit to standard output."},
       {NULL, NULL, 0, NULL}   /* sentinel */
   };

::

   void
   initkeywdarg(void)
   {
     /* Create the module and add the functions */
     Py_InitModule("keywdarg", keywdarg_methods);
   }


.. _buildvalue:

Building Arbitrary Values
=========================

This function is the counterpart to :c:func:`PyArg_ParseTuple`.  It is declared
as follows::

   PyObject *Py_BuildValue(char *format, ...);

It recognizes a set of format units similar to the ones recognized by
:c:func:`PyArg_ParseTuple`, but the arguments (which are input to the function,
not output) must not be pointers, just values.  It returns a new Python object,
suitable for returning from a C function called from Python.

One difference with :c:func:`PyArg_ParseTuple`: while the latter requires its
first argument to be a tuple (since Python argument lists are always represented
as tuples internally), :c:func:`Py_BuildValue` does not always build a tuple.  It
builds a tuple only if its format string contains two or more format units. If
the format string is empty, it returns ``None``; if it contains exactly one
format unit, it returns whatever object is described by that format unit.  To
force it to return a tuple of size 0 or one, parenthesize the format string.

Examples (to the left the call, to the right the resulting Python value)::

   Py_BuildValue("")                        None
   Py_BuildValue("i", 123)                  123
   Py_BuildValue("iii", 123, 456, 789)      (123, 456, 789)
   Py_BuildValue("s", "hello")              'hello'
   Py_BuildValue("ss", "hello", "world")    ('hello', 'world')
   Py_BuildValue("s#", "hello", 4)          'hell'
   Py_BuildValue("()")                      ()
   Py_BuildValue("(i)", 123)                (123,)
   Py_BuildValue("(ii)", 123, 456)          (123, 456)
   Py_BuildValue("(i,i)", 123, 456)         (123, 456)
   Py_BuildValue("[i,i]", 123, 456)         [123, 456]
   Py_BuildValue("{s:i,s:i}",
                 "abc", 123, "def", 456)    {'abc': 123, 'def': 456}
   Py_BuildValue("((ii)(ii)) (ii)",
                 1, 2, 3, 4, 5, 6)          (((1, 2), (3, 4)), (5, 6))


.. _refcounts:

Reference Counts
================

In languages like C or C++, the programmer is responsible for dynamic allocation
and deallocation of memory on the heap.  In C, this is done using the functions
:c:func:`malloc` and :c:func:`free`.  In C++, the operators ``new`` and
``delete`` are used with essentially the same meaning and we'll restrict
the following discussion to the C case.

Every block of memory allocated with :c:func:`malloc` should eventually be
returned to the pool of available memory by exactly one call to :c:func:`free`.
It is important to call :c:func:`free` at the right time.  If a block's address
is forgotten but :c:func:`free` is not called for it, the memory it occupies
cannot be reused until the program terminates.  This is called a :dfn:`memory
leak`.  On the other hand, if a program calls :c:func:`free` for a block and then
continues to use the block, it creates a conflict with re-use of the block
through another :c:func:`malloc` call.  This is called :dfn:`using freed memory`.
It has the same bad consequences as referencing uninitialized data --- core
dumps, wrong results, mysterious crashes.

Common causes of memory leaks are unusual paths through the code.  For instance,
a function may allocate a block of memory, do some calculation, and then free
the block again.  Now a change in the requirements for the function may add a
test to the calculation that detects an error condition and can return
prematurely from the function.  It's easy to forget to free the allocated memory
block when taking this premature exit, especially when it is added later to the
code.  Such leaks, once introduced, often go undetected for a long time: the
error exit is taken only in a small fraction of all calls, and most modern
machines have plenty of virtual memory, so the leak only becomes apparent in a
long-running process that uses the leaking function frequently.  Therefore, it's
important to prevent leaks from happening by having a coding convention or
strategy that minimizes this kind of errors.

Since Python makes heavy use of :c:func:`malloc` and :c:func:`free`, it needs a
strategy to avoid memory leaks as well as the use of freed memory.  The chosen
method is called :dfn:`reference counting`.  The principle is simple: every
object contains a counter, which is incremented when a reference to the object
is stored somewhere, and which is decremented when a reference to it is deleted.
When the counter reaches zero, the last reference to the object has been deleted
and the object is freed.

An alternative strategy is called :dfn:`automatic garbage collection`.
(Sometimes, reference counting is also referred to as a garbage collection
strategy, hence my use of "automatic" to distinguish the two.)  The big
advantage of automatic garbage collection is that the user doesn't need to call
:c:func:`free` explicitly.  (Another claimed advantage is an improvement in speed
or memory usage --- this is no hard fact however.)  The disadvantage is that for
C, there is no truly portable automatic garbage collector, while reference
counting can be implemented portably (as long as the functions :c:func:`malloc`
and :c:func:`free` are available --- which the C Standard guarantees). Maybe some
day a sufficiently portable automatic garbage collector will be available for C.
Until then, we'll have to live with reference counts.

While Python uses the traditional reference counting implementation, it also
offers a cycle detector that works to detect reference cycles.  This allows
applications to not worry about creating direct or indirect circular references;
these are the weakness of garbage collection implemented using only reference
counting.  Reference cycles consist of objects which contain (possibly indirect)
references to themselves, so that each object in the cycle has a reference count
which is non-zero.  Typical reference counting implementations are not able to
reclaim the memory belonging to any objects in a reference cycle, or referenced
from the objects in the cycle, even though there are no further references to
the cycle itself.

The cycle detector is able to detect garbage cycles and can reclaim them so long
as there are no finalizers implemented in Python (:meth:`__del__` methods).
When there are such finalizers, the detector exposes the cycles through the
:mod:`gc` module (specifically, the :attr:`~gc.garbage` variable in that module).
The :mod:`gc` module also exposes a way to run the detector (the
:func:`~gc.collect` function), as well as configuration
interfaces and the ability to disable the detector at runtime.  The cycle
detector is considered an optional component; though it is included by default,
it can be disabled at build time using the :option:`--without-cycle-gc` option
to the :program:`configure` script on Unix platforms (including Mac OS X) or by
removing the definition of ``WITH_CYCLE_GC`` in the :file:`pyconfig.h` header on
other platforms.  If the cycle detector is disabled in this way, the :mod:`gc`
module will not be available.


.. _refcountsinpython:

Reference Counting in Python
----------------------------

There are two macros, ``Py_INCREF(x)`` and ``Py_DECREF(x)``, which handle the
incrementing and decrementing of the reference count. :c:func:`Py_DECREF` also
frees the object when the count reaches zero. For flexibility, it doesn't call
:c:func:`free` directly --- rather, it makes a call through a function pointer in
the object's :dfn:`type object`.  For this purpose (and others), every object
also contains a pointer to its type object.

The big question now remains: when to use ``Py_INCREF(x)`` and ``Py_DECREF(x)``?
Let's first introduce some terms.  Nobody "owns" an object; however, you can
:dfn:`own a reference` to an object.  An object's reference count is now defined
as the number of owned references to it.  The owner of a reference is
responsible for calling :c:func:`Py_DECREF` when the reference is no longer
needed.  Ownership of a reference can be transferred.  There are three ways to
dispose of an owned reference: pass it on, store it, or call :c:func:`Py_DECREF`.
Forgetting to dispose of an owned reference creates a memory leak.

It is also possible to :dfn:`borrow` [#]_ a reference to an object.  The
borrower of a reference should not call :c:func:`Py_DECREF`.  The borrower must
not hold on to the object longer than the owner from which it was borrowed.
Using a borrowed reference after the owner has disposed of it risks using freed
memory and should be avoided completely. [#]_

The advantage of borrowing over owning a reference is that you don't need to
take care of disposing of the reference on all possible paths through the code
--- in other words, with a borrowed reference you don't run the risk of leaking
when a premature exit is taken.  The disadvantage of borrowing over owning is
that there are some subtle situations where in seemingly correct code a borrowed
reference can be used after the owner from which it was borrowed has in fact
disposed of it.

A borrowed reference can be changed into an owned reference by calling
:c:func:`Py_INCREF`.  This does not affect the status of the owner from which the
reference was borrowed --- it creates a new owned reference, and gives full
owner responsibilities (the new owner must dispose of the reference properly, as
well as the previous owner).


.. _ownershiprules:

Ownership Rules
---------------

Whenever an object reference is passed into or out of a function, it is part of
the function's interface specification whether ownership is transferred with the
reference or not.

Most functions that return a reference to an object pass on ownership with the
reference.  In particular, all functions whose function it is to create a new
object, such as :c:func:`PyInt_FromLong` and :c:func:`Py_BuildValue`, pass
ownership to the receiver.  Even if the object is not actually new, you still
receive ownership of a new reference to that object.  For instance,
:c:func:`PyInt_FromLong` maintains a cache of popular values and can return a
reference to a cached item.

Many functions that extract objects from other objects also transfer ownership
with the reference, for instance :c:func:`PyObject_GetAttrString`.  The picture
is less clear, here, however, since a few common routines are exceptions:
:c:func:`PyTuple_GetItem`, :c:func:`PyList_GetItem`, :c:func:`PyDict_GetItem`, and
:c:func:`PyDict_GetItemString` all return references that you borrow from the
tuple, list or dictionary.

The function :c:func:`PyImport_AddModule` also returns a borrowed reference, even
though it may actually create the object it returns: this is possible because an
owned reference to the object is stored in ``sys.modules``.

When you pass an object reference into another function, in general, the
function borrows the reference from you --- if it needs to store it, it will use
:c:func:`Py_INCREF` to become an independent owner.  There are exactly two
important exceptions to this rule: :c:func:`PyTuple_SetItem` and
:c:func:`PyList_SetItem`.  These functions take over ownership of the item passed
to them --- even if they fail!  (Note that :c:func:`PyDict_SetItem` and friends
don't take over ownership --- they are "normal.")

When a C function is called from Python, it borrows references to its arguments
from the caller.  The caller owns a reference to the object, so the borrowed
reference's lifetime is guaranteed until the function returns.  Only when such a
borrowed reference must be stored or passed on, it must be turned into an owned
reference by calling :c:func:`Py_INCREF`.

The object reference returned from a C function that is called from Python must
be an owned reference --- ownership is transferred from the function to its
caller.


.. _thinice:

Thin Ice
--------

There are a few situations where seemingly harmless use of a borrowed reference
can lead to problems.  These all have to do with implicit invocations of the
interpreter, which can cause the owner of a reference to dispose of it.

The first and most important case to know about is using :c:func:`Py_DECREF` on
an unrelated object while borrowing a reference to a list item.  For instance::

   void
   bug(PyObject *list)
   {
       PyObject *item = PyList_GetItem(list, 0);

       PyList_SetItem(list, 1, PyInt_FromLong(0L));
       PyObject_Print(item, stdout, 0); /* BUG! */
   }

This function first borrows a reference to ``list[0]``, then replaces
``list[1]`` with the value ``0``, and finally prints the borrowed reference.
Looks harmless, right?  But it's not!

Let's follow the control flow into :c:func:`PyList_SetItem`.  The list owns
references to all its items, so when item 1 is replaced, it has to dispose of
the original item 1.  Now let's suppose the original item 1 was an instance of a
user-defined class, and let's further suppose that the class defined a
:meth:`__del__` method.  If this class instance has a reference count of 1,
disposing of it will call its :meth:`__del__` method.

Since it is written in Python, the :meth:`__del__` method can execute arbitrary
Python code.  Could it perhaps do something to invalidate the reference to
``item`` in :c:func:`bug`?  You bet!  Assuming that the list passed into
:c:func:`bug` is accessible to the :meth:`__del__` method, it could execute a
statement to the effect of ``del list[0]``, and assuming this was the last
reference to that object, it would free the memory associated with it, thereby
invalidating ``item``.

The solution, once you know the source of the problem, is easy: temporarily
increment the reference count.  The correct version of the function reads::

   void
   no_bug(PyObject *list)
   {
       PyObject *item = PyList_GetItem(list, 0);

       Py_INCREF(item);
       PyList_SetItem(list, 1, PyInt_FromLong(0L));
       PyObject_Print(item, stdout, 0);
       Py_DECREF(item);
   }

This is a true story.  An older version of Python contained variants of this bug
and someone spent a considerable amount of time in a C debugger to figure out
why his :meth:`__del__` methods would fail...

The second case of problems with a borrowed reference is a variant involving
threads.  Normally, multiple threads in the Python interpreter can't get in each
other's way, because there is a global lock protecting Python's entire object
space.  However, it is possible to temporarily release this lock using the macro
:c:macro:`Py_BEGIN_ALLOW_THREADS`, and to re-acquire it using
:c:macro:`Py_END_ALLOW_THREADS`.  This is common around blocking I/O calls, to
let other threads use the processor while waiting for the I/O to complete.
Obviously, the following function has the same problem as the previous one::

   void
   bug(PyObject *list)
   {
       PyObject *item = PyList_GetItem(list, 0);
       Py_BEGIN_ALLOW_THREADS
       ...some blocking I/O call...
       Py_END_ALLOW_THREADS
       PyObject_Print(item, stdout, 0); /* BUG! */
   }


.. _nullpointers:

NULL Pointers
-------------

In general, functions that take object references as arguments do not expect you
to pass them *NULL* pointers, and will dump core (or cause later core dumps) if
you do so.  Functions that return object references generally return *NULL* only
to indicate that an exception occurred.  The reason for not testing for *NULL*
arguments is that functions often pass the objects they receive on to other
function --- if each function were to test for *NULL*, there would be a lot of
redundant tests and the code would run more slowly.

It is better to test for *NULL* only at the "source:" when a pointer that may be
*NULL* is received, for example, from :c:func:`malloc` or from a function that
may raise an exception.

The macros :c:func:`Py_INCREF` and :c:func:`Py_DECREF` do not check for *NULL*
pointers --- however, their variants :c:func:`Py_XINCREF` and :c:func:`Py_XDECREF`
do.

The macros for checking for a particular object type (``Pytype_Check()``) don't
check for *NULL* pointers --- again, there is much code that calls several of
these in a row to test an object against various different expected types, and
this would generate redundant tests.  There are no variants with *NULL*
checking.

The C function calling mechanism guarantees that the argument list passed to C
functions (``args`` in the examples) is never *NULL* --- in fact it guarantees
that it is always a tuple. [#]_

It is a severe error to ever let a *NULL* pointer "escape" to the Python user.

.. Frank Stajano:
   A pedagogically buggy example, along the lines of the previous listing, would
   be helpful here -- showing in more concrete terms what sort of actions could
   cause the problem. I can't very well imagine it from the description.


.. _cplusplus:

Writing Extensions in C++
=========================

It is possible to write extension modules in C++.  Some restrictions apply.  If
the main program (the Python interpreter) is compiled and linked by the C
compiler, global or static objects with constructors cannot be used.  This is
not a problem if the main program is linked by the C++ compiler.  Functions that
will be called by the Python interpreter (in particular, module initialization
functions) have to be declared using ``extern "C"``. It is unnecessary to
enclose the Python header files in ``extern "C" {...}`` --- they use this form
already if the symbol ``__cplusplus`` is defined (all recent C++ compilers
define this symbol).


.. _using-capsules:

Providing a C API for an Extension Module
=========================================

.. sectionauthor:: Konrad Hinsen <hinsen@cnrs-orleans.fr>


Many extension modules just provide new functions and types to be used from
Python, but sometimes the code in an extension module can be useful for other
extension modules. For example, an extension module could implement a type
"collection" which works like lists without order. Just like the standard Python
list type has a C API which permits extension modules to create and manipulate
lists, this new collection type should have a set of C functions for direct
manipulation from other extension modules.

At first sight this seems easy: just write the functions (without declaring them
``static``, of course), provide an appropriate header file, and document
the C API. And in fact this would work if all extension modules were always
linked statically with the Python interpreter. When modules are used as shared
libraries, however, the symbols defined in one module may not be visible to
another module. The details of visibility depend on the operating system; some
systems use one global namespace for the Python interpreter and all extension
modules (Windows, for example), whereas others require an explicit list of
imported symbols at module link time (AIX is one example), or offer a choice of
different strategies (most Unices). And even if symbols are globally visible,
the module whose functions one wishes to call might not have been loaded yet!

Portability therefore requires not to make any assumptions about symbol
visibility. This means that all symbols in extension modules should be declared
``static``, except for the module's initialization function, in order to
avoid name clashes with other extension modules (as discussed in section
:ref:`methodtable`). And it means that symbols that *should* be accessible from
other extension modules must be exported in a different way.

Python provides a special mechanism to pass C-level information (pointers) from
one extension module to another one: Capsules. A Capsule is a Python data type
which stores a pointer (:c:type:`void \*`).  Capsules can only be created and
accessed via their C API, but they can be passed around like any other Python
object. In particular,  they can be assigned to a name in an extension module's
namespace. Other extension modules can then import this module, retrieve the
value of this name, and then retrieve the pointer from the Capsule.

There are many ways in which Capsules can be used to export the C API of an
extension module. Each function could get its own Capsule, or all C API pointers
could be stored in an array whose address is published in a Capsule. And the
various tasks of storing and retrieving the pointers can be distributed in
different ways between the module providing the code and the client modules.

Whichever method you choose, it's important to name your Capsules properly.
The function :c:func:`PyCapsule_New` takes a name parameter
(:c:type:`const char \*`); you're permitted to pass in a *NULL* name, but
we strongly encourage you to specify a name.  Properly named Capsules provide
a degree of runtime type-safety; there is no feasible way to tell one unnamed
Capsule from another.

In particular, Capsules used to expose C APIs should be given a name following
this convention::

    modulename.attributename

The convenience function :c:func:`PyCapsule_Import` makes it easy to
load a C API provided via a Capsule, but only if the Capsule's name
matches this convention.  This behavior gives C API users a high degree
of certainty that the Capsule they load contains the correct C API.

The following example demonstrates an approach that puts most of the burden on
the writer of the exporting module, which is appropriate for commonly used
library modules. It stores all C API pointers (just one in the example!) in an
array of :c:type:`void` pointers which becomes the value of a Capsule. The header
file corresponding to the module provides a macro that takes care of importing
the module and retrieving its C API pointers; client modules only have to call
this macro before accessing the C API.

The exporting module is a modification of the :mod:`spam` module from section
:ref:`extending-simpleexample`. The function :func:`spam.system` does not call
the C library function :c:func:`system` directly, but a function
:c:func:`PySpam_System`, which would of course do something more complicated in
reality (such as adding "spam" to every command). This function
:c:func:`PySpam_System` is also exported to other extension modules.

The function :c:func:`PySpam_System` is a plain C function, declared
``static`` like everything else::

   static int
   PySpam_System(const char *command)
   {
       return system(command);
   }

The function :c:func:`spam_system` is modified in a trivial way::

   static PyObject *
   spam_system(PyObject *self, PyObject *args)
   {
       const char *command;
       int sts;

       if (!PyArg_ParseTuple(args, "s", &command))
           return NULL;
       sts = PySpam_System(command);
       return Py_BuildValue("i", sts);
   }

In the beginning of the module, right after the line ::

   #include "Python.h"

two more lines must be added::

   #define SPAM_MODULE
   #include "spammodule.h"

The ``#define`` is used to tell the header file that it is being included in the
exporting module, not a client module. Finally, the module's initialization
function must take care of initializing the C API pointer array::

   PyMODINIT_FUNC
   initspam(void)
   {
       PyObject *m;
       static void *PySpam_API[PySpam_API_pointers];
       PyObject *c_api_object;

       m = Py_InitModule("spam", SpamMethods);
       if (m == NULL)
           return;

       /* Initialize the C API pointer array */
       PySpam_API[PySpam_System_NUM] = (void *)PySpam_System;

       /* Create a Capsule containing the API pointer array's address */
       c_api_object = PyCapsule_New((void *)PySpam_API, "spam._C_API", NULL);

       if (c_api_object != NULL)
           PyModule_AddObject(m, "_C_API", c_api_object);
   }

Note that ``PySpam_API`` is declared ``static``; otherwise the pointer
array would disappear when :func:`initspam` terminates!

The bulk of the work is in the header file :file:`spammodule.h`, which looks
like this::

   #ifndef Py_SPAMMODULE_H
   #define Py_SPAMMODULE_H
   #ifdef __cplusplus
   extern "C" {
   #endif

   /* Header file for spammodule */

   /* C API functions */
   #define PySpam_System_NUM 0
   #define PySpam_System_RETURN int
   #define PySpam_System_PROTO (const char *command)

   /* Total number of C API pointers */
   #define PySpam_API_pointers 1


   #ifdef SPAM_MODULE
   /* This section is used when compiling spammodule.c */

   static PySpam_System_RETURN PySpam_System PySpam_System_PROTO;

   #else
   /* This section is used in modules that use spammodule's API */

   static void **PySpam_API;

   #define PySpam_System \
    (*(PySpam_System_RETURN (*)PySpam_System_PROTO) PySpam_API[PySpam_System_NUM])

   /* Return -1 on error, 0 on success.
    * PyCapsule_Import will set an exception if there's an error.
    */
   static int
   import_spam(void)
   {
       PySpam_API = (void **)PyCapsule_Import("spam._C_API", 0);
       return (PySpam_API != NULL) ? 0 : -1;
   }

   #endif

   #ifdef __cplusplus
   }
   #endif

   #endif /* !defined(Py_SPAMMODULE_H) */

All that a client module must do in order to have access to the function
:c:func:`PySpam_System` is to call the function (or rather macro)
:c:func:`import_spam` in its initialization function::

   PyMODINIT_FUNC
   initclient(void)
   {
       PyObject *m;

       m = Py_InitModule("client", ClientMethods);
       if (m == NULL)
           return;
       if (import_spam() < 0)
           return;
       /* additional initialization can happen here */
   }

The main disadvantage of this approach is that the file :file:`spammodule.h` is
rather complicated. However, the basic structure is the same for each function
that is exported, so it has to be learned only once.

Finally it should be mentioned that Capsules offer additional functionality,
which is especially useful for memory allocation and deallocation of the pointer
stored in a Capsule. The details are described in the Python/C API Reference
Manual in the section :ref:`capsules` and in the implementation of Capsules (files
:file:`Include/pycapsule.h` and :file:`Objects/pycapsule.c` in the Python source
code distribution).

.. rubric:: Footnotes

.. [#] An interface for this function already exists in the standard module :mod:`os`
   --- it was chosen as a simple and straightforward example.

.. [#] The metaphor of "borrowing" a reference is not completely correct: the owner
   still has a copy of the reference.

.. [#] Checking that the reference count is at least 1 **does not work** --- the
   reference count itself could be in freed memory and may thus be reused for
   another object!

.. [#] These guarantees don't hold when you use the "old" style calling convention ---
   this is still found in much existing code.
