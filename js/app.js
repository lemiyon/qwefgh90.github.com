var myApp = angular.module('myApp', []);	//앱 이름 설정
myApp.controller('MainCtrl', ['$scope', function ($scope) {
	$scope.text = 'hello angular js';	//$scope는 컨트롤러를 가르키는 요소의 네임스페이스를 말한다.
	$scope.user={};
	$scope.user.info={
		'name':'최창원',
		'desc':'AngularJS로 나만의 정적 페이지 만들기'
	};

}]);


myApp.directive('customButton', function () {
	return {
	restrict: 'A',
	replace: true,
	transclude: true,
	template: '<a href="" class="myawesomebutton" ng-transclude>' +
	            '<i class="icon-ok-sign"></i>' +
	          '</a>',
	link: function (scope, element, attrs) {
	  // DOM 조작과 이벤트 설정은 여기서!
	}
	};
});

myApp.controller('NavCtrl', ['$scope', function ($scope) {}]);
myApp.controller('UserCtrl', ['$scope', function ($scope) {}]);