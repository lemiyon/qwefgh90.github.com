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

우리는 파이썬에서 호출할 수 있는 C 함수를 만드는데 집중했다. 그 반대 또한 유용하다. (C에서 호출되는 파이썬 함수) 이것은 특히 callback 함수를 지원하는 라이브러리들을 위한 케이스이다. 만약 C 인터페이스가 콜백을 활용할 경우 이와 동등하게 파이썬은 종종 콜백 매커니즘을 파이썬 프로그래머에게 제공할 필요가 있다. 즉 구현내용은 C 콜백에서 파이썬 콜백을 호출하는 것이다. 이외에 다른 방법으로 사용할 수도 있을 것이다. 

운이 좋게도 파이썬 인터프리터는 쉽게 호출된다. 그리고 파이썬 함수를 호출할 수 있는 표준 인터페이스도 있다. (어떻게 파이썬 파서를 특수한 문자열과 함께 호출하는지 말하지 않을것이다. 만약 이것에 관심이 있다면 :file:`Modules/main.c 에 :option:`-c` 명령어 라인의 구현을 보는것을 추천한다.)

파이썬 함수를 호출하는것은 쉽다. 첫째로 왜그런지 모르겠지만 파이썬 프로그램은 파이썬 함수 객체를 당신에게 전달한다. 당신은 이것을 하기 위한 함수를 제공해야한다. 이 함수가 호출되었을때 파이썬 함수 객체의 포인터를 저장하면 된다. (전역 변수에 저장할때 :c:func:`Py_INCREF` 를 호출하는 것에 유의해라) 그 예로 밑의 함수는 모듈 정의의 일부분이다.::

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

이 함수는 :const:`METH_VARARGS` 플래그와 할께 인터프리터에 등록되어 있어야 한다. 이 부분은 :ref:`methodtable` 섹션에 설명되어 있다. :c:func:`PyArg_ParseTuple` 함수와 인자들은 :ref:`parsetuple` 섹션에 설명되어 있다.

:c:func:`Py_XINCREF` 와 :c:func:`Py_XDECREF` 매크로는 객체의 참조 카운트를 증가시키거나 감소시킨다. 또한 이 매크로는 *NULL* 포인터에 안전하다. (그러나 *temp* 는 현재 문맥상 *NULL* 포인터가 될 수 없다.) 더 자세한 정보는 :ref:`refcounts` 섹션에 있다.

.. index:: single: PyObject_CallObject()

나중에 이러한 함수를 호출할때 당신은 C 함수 :c:func:`PyObject_CallObject` 함수를 사용하면 된다. 이 함수는 2개의 인자를 가지고 있다. 둘다 임의의 파이썬 객체를 가르키는 포인터이다. 이 2가지 인자는 파이썬 함수와 인자리스트이다. 인자의 리스트는 언제나 튜플 객체이다. (인자의 개수만 길이를 가지는) 인자없는 파이썬 함수를 호출할때는 NULL을 인자로 넣어주거나 비어있는 튜플 객체를 전달하면 된다. 하나의 인자를 가지는 파이썬 함수를 호출할때는 싱글톤 튜플 객체를 넘기면 된다. :c:func:`Py_BuildValue` 는 괄호로 둘러쌓인 포맷 스트링을 입력받아 튜플 객체를 반환한다. 예를들어::

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



:c:func:`PyObject_CallObject` 은 파이썬 객체 포인터를 반환한다. 이것은 파이썬 함수의 반환값이다. :c:func:`PyObject_CallObject` 함수는 입력 인자에 관해 "참조-카운트-중립" 이라는 특성을 지니고 있다. :c:func:`PyObject_CallObject` 를 호출한 후에 바로 :c:func:`Py_DECREF` 에 :c:func:`PyObject_CallObject` 의 인자로 사용된 투플을 입력 인자로 넣고 호출한다. (*역자* 사용된 튜플을 가비지 컬렉팅하기 위해 호출하는 것으로 이해함.)

:c:func:`PyObject_CallObject` 의 반환값은 새로운 객체이거나 존재하는 객체(참조 카운트가 증가된)이다. 그래서 만약 당신이 전역변수에 저장하는것을 원하지 않는다면 당신은 :c:func:`Py_DECREF` 를 호출해야한다. 특히 이 변수에 관심이 없을때 사용하면 된다.

당신이 이것을 하기전에 반환값이 *NULL* 인지 확인하는것이 중요하다. 만약 그렇다면 파이썬 함수는 예외를 발생하며 종료된 것이다. 만약 :c:func:`PyObject_CallObject` 를 호출한 C 코드가 파이썬에서 호출된 것이라면 에러 징후를 바로 반환하며 호출자에게 알려야 한다. 그러면 인터프리터는 스택 추적 내역을 출력하거나 예외 처리 함수를 호출할 것이다. 만약 이것을 원하지 않는다면 예외는 :c:func:`PyErr_Clear` 를 호출함으로써 제거하면 된다. 예를들어::

   if (result == NULL)
       return NULL; /* Pass error back */
   ...use result...
   Py_DECREF(result);

파이썬 콜백 함수의 인터페이스에 따라 당신은 인자 리스트를 :c:func:`PyObject_CallObject` 에 제공할 것이다. 몇몇 케이스에서 인자 리스트는 파이썬 프로그램에서 제공된다. 이것은 저장될 수 있고 함수 객체와 같은 방식으로 사용된다. 몇몇 다른 케이스에선 당신은 새로운 튜플을 생성할 필요도 있다. 가장 간단한 방식은 :c:func:`Py_BuildValue` 를 호출하는 것이다. 예를들어 만약 당신이 전체 이벤트 코드를 전달하기 원한다면 아래 코드를 사용하면 된다.::

   PyObject *arglist;
   ...
   arglist = Py_BuildValue("(l)", eventcode);
   result = PyObject_CallObject(my_callback, arglist);
   Py_DECREF(arglist);
   if (result == NULL)
       return NULL; /* Pass error back */
   /* Here maybe use the result */
   Py_DECREF(result);

에러 체크를 하기 전에 함수를 호출한 후 바로 ``Py_DECREF(arglist)`` 를 호출해라. 또한 엄격하게 말해서 이 코드는 완벽하지 않다. :c:func:`Py_BuildValue` 역시 메모리 부족이 발생할 수 있고 이것 역시 에러가 검사되어야 완벽하다.

당신은 :c:func:`PyObject_Call` 을 사용함으로써 키워드 인자들을 사용해 함수를 호출할 수 있다. 위의 예제에서 우리는 :c:func:`Py_BuildValue` 를 사용하여 키워드 인자를 만들 수 있다. ::

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

확장 함수에서의 매개변수 파싱
============================================

.. index:: single: PyArg_ParseTuple()

:c:func:`PyArg_ParseTuple` 함수는 아래와 같이 선언되어 있다.::

   int PyArg_ParseTuple(PyObject *arg, char *format, ...);

*arg* 인자는 파이썬에서 C 함수로 전달된 인자리스트를 포함한 튜플 객체이다.
*format* 인자는 :ref:`arg-parsing` 에 설명된 문법대로 구성된 포맷 스트링이다.
나머지 인자는 포맷 스트링에 정의된 변수의 주소이다. 

:c:func:`PyArg_ParseTuple` 은 파이썬 인자가 요구한 타입과 일치하는지 확인한다. 이것은 호출시 전달된 C 변수의 주소의 타당성을 검사할 수 없다. 만약 그 부분에 실수가 발생한다면 당신의 코드는 크래시를 발생시키거나 메모리상 임의의 비트를 덮어쓰게 된다. 
이 부분을 주의해라!

호출자에게 제공되는 파이썬 객체는 *빌린* 객체다. 굳이 참조 카운트를 감소시킬 필요가 없다.

호출 예제::

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

확장함수를 위한 키워드 매개변수 
==========================================

.. index:: single: PyArg_ParseTupleAndKeywords()

:c:func:`PyArg_ParseTupleAndKeywords` 함수는 아래와 같이 정의되어 있다.::

   int PyArg_ParseTupleAndKeywords(PyObject *arg, PyObject *kwdict,
                                   char *format, char *kwlist[], ...);

*arg* 와 *format* 매개변수는 :c:func:`PyArg_ParseTuple` 함수와 동일하다. *kwdict* 매개변수는 3번재 매개변수로 전달 받는 사전형태의 변수이다. *kwlist* 매개변수는 *NULL* 로 끝나는 문자열들의 리스트이다. 이름들은 *format* 으로부터 전달된 타입 정보와 어울린다. 성공한다면 :c:func:`PyArg_ParseTupleAndKeywords` 함수는 true를 반환하고 그렇지 않다면 false를 변환하고 적절한 예외를 발생시킬 것이다. 

The *arg* and *format* parameters are identical to those of the
:c:func:`PyArg_ParseTuple` function.  The *kwdict* parameter is the dictionary of
keywords received as the third parameter from the Python runtime.  The *kwlist*
parameter is a *NULL*-terminated list of strings which identify the parameters;
the names are matched with the type information from *format* from left to
right.  On success, :c:func:`PyArg_ParseTupleAndKeywords` returns true, otherwise
it returns false and raises an appropriate exception.

.. note::

   키워드 인자를 사용할때 튜플은 파싱될 수 없다. *kwlist* 에 존재하지않는 키워드 매개변수는 :exc:`TypeError` 를 발생시킨다. 

.. index:: single: Philbrick, Geoff

여기에 키워드를 사용한 예제가 있다. 이 예제는 Geoff Philbrick (philbrick@hks.com)이 작성하였다.::

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

변수 생성
=========================

이 함수는 :c:func:`PyArg_ParseTuple` 와 대응 관계가 있다. 이것은 아래와 같이 선언되어 있다.::

   PyObject *Py_BuildValue(char *format, ...);

:c:func:`PyArg_ParseTuple` 에서 인지되는 포맷스트링과 유사하다. 그러나 함수의 입력으로 들어오는 인자들은 반드시 포인터일 필요가 없다. 이것은 새로운 파이썬 객체를 반환한다. 이는 C 함수의 반환값에 사용될때 적절하다.

:c:func:`PyArg_ParseTuple`: 은 첫번째 인자로 튜플을 요구하지만 (파이썬 인자리스트는 내부적으로 튜플이다) :c:func:`Py_BuildValue` 은 언제나 튜플을 만들지 않는다. 오직 포맷 스트링이 두개 이상의 포맷 요소들을 포함할때 튜플을 만든다. 만약 포맷 스트링이 비어있다면 이것은 ``None`` 을 반환할 것이다. 만약 정확하게 하나의 포맷 요소를 포함한다면 이것은 이 포맷 요소가 묘사된 어떤 객체를 반환할 것이다. 강제로 사이즈가 없는 튜플을 반환하게 하도록 하기 위해선 괄호 쌍을 포맷 스트링으로 주면 된다.

예제 (왼쪽은 호출 형태이고 오른쪽은 반환된 파이썬 변수이다.)::

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

참조 카운트
=============

C나 C++ 언어에서 프로그래머는 힙 메모리 동적할당과 할당해제에 대한 책임을 지게된다. C에서는 :c:func:`malloc` 그리고 :c:func:`free` 함수를 사용한다. C++ 에서는 ``new`` 연산자나 ``delete`` 연산자를 사용한다. 

:c:func:`malloc` 에 의해 할당된 모든 메모리 블럭은 결국 :c:func:`free` 함수 호출과 함께 반환된다. :c:func:`free` 를 제때 호출하는 것은 매우 중요하다. 만약 :c:func:`free` 를 호출하지 않는다면 프로그램이 종료될때까지 메모리는 재사용될 수 없다. 이것은 소위 :dfn:`memory leak` 이라 불린다. 만약 프로그램이 :c:func:`free` 를 호출한 이후에도 블록을 계속해서 사용한다면 이것은 다른 :c:func:`malloc` 호출로 재사용되는 블록과 충돌을 발생시킬 것이다. 이것은 소위 :dfn:`using freed memory` 라 불린다. 이것은 코어 덤프, 잘못된 결과, 알수없는 크래시를 발생 시키게 된다. 

일반적으로 메모리 릭의 원인은 비정상적인 코드이다. 예를들어 함수에서 메모리를 할당하고 계산한다음 메모리 블록을 반환한다. 어떤 함수에 대한 요구사항의 변화로 에러 상태를 탐지하는 테스트 코드를 추가할 것이다. 그리고 너무 이르게 함수가 반환할 수 있다. 너무 이르게 함수가 종료 되었을때 할당된 메모리 블럭을 반환하는것을 잊기 쉽다. 특히 이것이 나중에 추가되었을때 더욱 그렇다. 이러한 누수는 종종 오랜 시간동안 감지되지 않는다. 에러로 인해 함수를 빠져나가는 것은 수 많은 함수 호출의 일부분이다. 대부분의 현대 컴퓨터들은 풍부한 가상 메모리를 가지고 있기 때문에 메모리 릭은 누수 함수를 자주 사용하며 오래동안 동작하는 프로세스에서 발생한다. 그러므로 코딩 관습이나 그러한 에러를 최소화하는 전략을 사용하여 메모리 릭을 예방하는것은 매우 중요하다. 

파이썬은 :c:func:`malloc` 과 :c:func:`free` 함수를 많이 이용하기 때문에 해제된 메모리 사용과 메모리 릭을 피할 수 있는 전략이 필요하다. 파이썬에서 채택한 방법은 :dfn:`reference counting` 기법이다. 원리는 간단하다. 모든 객체는 객체의 참조값이 저장될때 값 증가하는 카운터를 가지고 있다. 참조값을 저장하지 않을때면 값이 줄어들게 된다. 카운터가 0에 도달하게 되면 객체에 대한 마지막 참조가 삭제되었단 뜻이고 객체는 메모리 해제될 것이다.

An alternative strategy is called :dfn:`automatic garbage collection` .
(Sometimes, reference counting is also referred to as a garbage collection
strategy, hence my use of "automatic" to distinguish the two.) 자동 가비지 컬렉션의 큰 이점은 사용자가 :c:func:`free` 를 명시적으로 호출할 필요가 없는 것이다. (다른 이점으론 속도의 향상과 메모리 사용이다.) 단점은 C 에선 자동 가비지 컬렉터를 가지고 있지 않다는 것이다. 참조 카운팅은 간편하게 구현될 수 있다. 언젠가 자동 가비지 컬렉터가 C 에서 이용 가능할 것이다. 그때까지 우리는 참조 카운트와 함께 지내야할 것이다.

파이썬은 전통적인 참조 카운팅 구현을 사용하면서 참조 사이클을 검사하는 사이클 탐지기를 제공한다. 이것은 어플리케이션이 직접 또는 간접 원형 참조가 생기는지 걱정하지 않게한다. 이것은 오직 참조 카운팅만 사용했을 때의 약점이다. 참조 사이클은 그들 스스로를 참조하는 객체들로 구성되어 있다. 사이클의 각각의 객체들은 참조 카운트는 0이 될 수 없다. 사이클에 대한 참조가 더이상 없더라도 전형적인 참조 카운팅 구현들은 사이클에 포함된 객체들에 속하는 메모리들을 되찾을 수 없다. 또 사이클 속 객체들에 의해 참조되는 메모리들도 마찬가지 이다.

사이클 탐지기는 파이썬에 종결자(:dfn:`finalizer`)만 없다면 가비지 사이클을 참지할 수 있고 그 메모리를 되찾을 수 있다 (:meth:`__del__` methods). 만약 종결자가 있다면 탐지기는 :mod:`gc` 모듈에 사이클을 노출시킨다. (특히, 모듈 안의 :attr:`~gc.garbage` 변수) :mod:`gc` 모듈은 탐지기를 동작시키는 (:func:`~gc.collect` 함수) 방법과 인터페이스 구성 그리고 런타임에 탐지기를 사용하지 않는 방법을 알려준다. 사이클 탐지기는 기본적으로 포함되어 있지만 부가적인 컴포넌트이다. 이것은 빌드하는 시기에 :option:`--without-cycle-gc` 옵션을 :program:`configure` 스크립트에 추가(유닉스 계열)하거나 ``WITH_CYCLE_GC`` 정의를 :file:`pyconfig.h` 헤더에서 제거 함으로써 중단시킬 수 있다. 만약 이런 방식으로 사이클 탐지기가 중단된다면 :mod:`gc` 모듈을 이용할 수 없을것이다. 


.. _refcountsinpython:

파이썬에서 참조 카운팅
----------------------------

참조 카운트를 증가, 감소 시킬 수 있는 ``Py_INCREF(x)`` , ``PyDECREF(x)`` 매크로가 있다. 또한 카운트가 0에 도달 했을때 :c:func:`Py_DECREF` 는 객체를 해제한다. 유연성을 위해 이것은 직접적으로 :c:func:`free` 를 호출하지 않고 이 객체의 :dfn:`type object` 안의 함수 포인터를 통해 호출한다. 이러한 방식을 위해 모든 객체는 이것의 타입 객체에 대한 포인터를 포함하고 있다. 

가장 큰 문제는 언제 ``Py_INCREF(x)`` 와 ``Py_DECREF(x)`` 를 사용하는게 좋은지이다. 먼저 몇몇 용어를 소개하겠다. Nobody "owns" an object; however, you can
:dfn:`own a reference` to an object.  An object's reference count is now defined
as the number of owned references to it. 참조가 더이상 필요하지 않을때 참조의 주인은 :c:func:`Py_DECREF` 를 호출할 책임이 있다. 참조에 대한 소유권은 전이될 수 있다. 소유한 참조를 제거할 수 있는 3가지 방법이 있다. 이것을 전달하거나 저장하거나 :c:func:`Py_DECREF` 를 호출하는 것이다. 참조를 제거하는것을 잊는다면 메모리 릭이 발생할 것이다.

[#]_ 객체에 대한 참조를 :dfn:`borrow` 하는것이 가능하다. 참조의 임차인은 :c:func:`Py_DECREF` 를 호출할 필요가 없다. 암치인은 그 객체의 주인보다 오랫동안 객체를 가지고 있어선 안된다. 객체의 주인이 그것을 버린 후 임차인이 객체를 사용하는것은 :dfn:`using freed memory` 를 발생 시킬 수 있으므로 그러지 않아야 한다. [#]_

객체를 빌리는것의 이점은 당신이 객체를 버리는것에 관심을 가질 필요가 없다는 점이다. 빌린 참조를 사용할때는 예상보다 빠르게 함수가 종료되더라도 메모리 릭에 대한 위험이 없다. 참조를 빌르는것의 단점으로는 미묘한 상황이 발생할 수 있다는 점이다. 참조의 소유자가 객체를 제거한 후에 겉보기엔 빌린 객체가 사용되는 상황이다.

:c:func:`Py_INCREF` 를 호출함으로써 빌린 참조는 소유한 참조로 변할 수 있다. 이것은 빌려준 주인의 상태에 전혀 영향을 미치지 않는다. 이것은 새로운 소유 참조를 만들것이고 완벽한 소유 책임을 부여할 것이다. 이전 소유자와 새로운 소유자는 참조를 적절히 버려야한다.)

.. _ownershiprules:

소유권 규칙
---------------

함수 입출력으로 객체 참조가 전달될때 소유권이 전달되는지 안되는지는 함수의 인터페이스 명세의 일부분이다.

객체의 참조를 반환하는 대부분의 함수는 소유권을 참조와 함께 전달한다. 특히 새로운 객체를 만드는 함수인 :c:func:`PyInt_FromLong` 나 :c:func:`Py_BuildValue` 은 호출자에게 소유권을 전달한다. 비록 실제로 객체가 새롭지 않더라도 당신은 그 객체 참조의 소유권을 받을 것이다. 예를들어 :c:func:`PyInt_FromLong` 은 인기있는 변수의 캐시를 유지하고 캐시된 항목의 참조값을 반환할 수 있다.

다른 객체로부터 객체를 생성해주는 함수들 또한 소유권을 전달한다. 예를들어 :c:func:`PyObject_GetAttrString` 와 같은 함수가 있다. 그러나 모두 그렇지는 않다. :c:func:`PyTuple_GetItem`, :c:func:`PyList_GetItem`, :c:func:`PyDict_GetItem`, 그리고
:c:func:`PyDict_GetItemString` 는 너가 빌려준 튜플, 리스트, 딕셔너리를 반환한다.

비록 실제로 객체를 만들어 반환할지라도 :c:func:`PyImport_AddModule` 함수 또한 빌린 참조를 반환한다. 소유한 참조는 ``sys.modules`` 에 저장되어 있기 때문이다.

당신이 객체 참조를 다른 함수로 전달했을때 일반적으로 함수는 참조를 당신으로부터 빌리게 된다. 만약 이 변수를 저장할 필요가 있다면 :c:func:`Py_INCREF` 를 사용해라. 이 규칙에는 정확히 2개의 중요한 예외가 있다. :c:func:`PyTuple_SetItem` 과 :c:func:`PyList_SetItem` 이다. 이 함수들은 자신들에게 전달된 아이템의 소유권을 인계받는다. 비록 그들이 실패하더라도 그렇다. (:c:func:`PyDict_SetItem` 과 그 비슷한 함수들은 소유권을 가져가지 않는다. 그 함수들은 정상이라 할 수 있다.)

파이썬으로 부터 C 함수가 호출될때 이것은 호출자로 부터 전달된 참조값을 빌린다. 호출자가 객체의 참조를 소유한다. 그래서 빌린 참조의 생존시간은 함수가 리턴될때 까지 보증된다. 오직 그러한 빌린 참조가 저장되거나 전달될때 :c:func:`Py_INCREF` 를 호출 함으로써 이것은 소유한 참조로 변하게 된다.

이 파이썬으로부터 호출된 C 함수로 부터 반환된 객체 참조는 소유된 참조여야 한다. 즉 소유권은 함수에서 호출자에게 전달된다.

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
