class Person:

    def __call__(self,name):
        self.name = name
        print('Hello',name)

person = Person()


#call让对象可以像函数一样被调用
person('xiaoming')

# result = person
# print(result)
