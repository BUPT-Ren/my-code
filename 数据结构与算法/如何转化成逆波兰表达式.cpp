//从中值表达式 转换成 逆波兰表达式
//这里使用符号栈
//求解 逆波兰表达式 用的是 数字栈
//遇到数字 直接输出
//所有符号 都按照优先级的高低进入符号栈 栈为空 就直接入栈
//对于左括号 所有符号都是高优先级
//如果你是右括号 此时就一直出栈 直到遇到左括号
//任何相对于栈顶是高优先级的符号全部直接压入栈
//如果比栈顶优先级优先级低 就直接输出当前栈顶符号
//如果当前符号优先级和栈顶符号相同 输出栈顶符号 继续比较当前符号和下一个符号
//然后用当前符号和栈顶符号继续比较（这里需要分情况讨论 1、你现在栈里面没东西 直接入栈
//如果符号比较（循环）完了 符号栈还有符号 顺序出栈


# include<iostream>
# include<string>
# include<stack>
using namespace std;
//传进来中缀表达式
//比较符号优先级
bool Priority(char ch, char topch){
    //一共就四个符号 +- */
    if ((ch == '*' || ch == '/') && (topch == '+' || topch == '-')){
         return true;
    }
    //还有两个 符号 左括号 右括号
    //左括号有最低优先级
    if (topch == '(' && ch != '('
         && ch != ')'){
        return true;
    }
    if (ch == '('){  //可以没必要写 但写出来更清楚
        return false;
    }
    else{
        return false;
    }
}
string MiddleToEndExpr(string expr){
    string result; //存放我们的结果
    // 定义一个符号栈
    stack<char> s;
    for (char ch : expr){
        //遇到数字 直接输出
        if (ch >= '0' && ch <= '9'){
            //push_back 就是把元素压入末尾
            result.push_back(ch);
        }
        else{
            while (true){
                //栈空 或 左括号 直接入栈
                if (s.empty() || ch == '('){
                    s.push(ch);
                    break;
                }
                char topch = s.top();
                //当前符号优先级比栈顶高 → 入栈
                if (Priority(ch, topch)){
                    s.push(ch);
                    break;
                }
                //否则弹出栈顶（左括号只弹不输出）
                s.pop();
                if (topch == '('){
                    break;
                }
                result.push_back(topch);
            }
        }
    }
    //如果符号栈还存留符号 一直出栈 push_back() 到 result
    while (! s.empty()){
        char topch = s.top();
        result.push_back(topch);
        s.pop();
    }
    return result;
}

int main(){
    string tests[] = {
        "1+2*3",
        "(1+2)*3",
        "1+2+3",
        "1*2+3",
        "9-5+2",
        "2*3/4",
        "1+(2+3)*4",
        "3",
        "(1)",
        "8/2-3"
    };
    string expected[] = {
        "123*+",
        "12+3*",
        "12+3+",
        "12*3+",
        "95-2+",
        "23*4/",
        "123+4*+",
        "3",
        "1",
        "82/3-"
    };
    int n = sizeof(tests) / sizeof(tests[0]);
    int pass = 0;
    for (int i = 0; i < n; i++){
        string got = MiddleToEndExpr(tests[i]);
        bool ok = (got == expected[i]);
        cout << (ok ? "[PASS] " : "[FAIL] ")
             << tests[i] << " -> " << got
             << (ok ? "" : ("  (期望 " + expected[i] + ")"))
             << endl;
        if (ok) pass++;
    }
    cout << pass << "/" << n << " 通过" << endl;
    return 0;
}
